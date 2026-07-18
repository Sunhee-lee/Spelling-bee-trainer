import type { SupabaseClient } from "@supabase/supabase-js";

import type { LessonProgress } from "@/services/lessons";
import type { LessonProgressRow } from "@/lib/supabase/types";
import {
  readAllLessons,
  setLessonWriteObserver,
  writeAllLessons,
  type LessonProgressByBook,
} from "@/lib/lessonProgress";

/**
 * Cloud sync for Basic 100 lesson progress.
 *
 * LocalStorage is the cache/offline store; Supabase is the source of truth when
 * signed in. Book ids are preserved across local↔cloud, so a lesson is keyed by
 * (book_id, lesson_number) on both sides. This layer is intentionally separate
 * from the main app-state sync so the two never conflict.
 *
 * Only the two completion timestamps are synced (the "Learning" in-progress
 * marker stays local). Merges are a conflict-free union that keeps the earliest
 * completion time, so re-syncing is idempotent and no update ever clobbers a
 * completion recorded elsewhere.
 */

let cloud: { client: SupabaseClient; userId: string } | null = null;

// --- pure merge helpers (unit-tested) --------------------------------------

/** The earliest of two optional epoch-ms timestamps (undefined if neither). */
function earliest(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/** Merge two lesson-progress records: union of completions, earliest wins. */
export function mergeLessonProgress(
  a: LessonProgress | undefined,
  b: LessonProgress | undefined
): LessonProgress {
  const out: LessonProgress = {};
  const started = earliest(a?.learnStartedAt, b?.learnStartedAt);
  const learn = earliest(a?.learnCompletedAt, b?.learnCompletedAt);
  const test = earliest(a?.testCompletedAt, b?.testCompletedAt);
  if (started != null) out.learnStartedAt = started;
  if (learn != null) out.learnCompletedAt = learn;
  if (test != null) out.testCompletedAt = test;
  return out;
}

/** Merge two whole progress maps (by book id, then lesson index). */
export function mergeLessonMaps(
  a: LessonProgressByBook,
  b: LessonProgressByBook
): LessonProgressByBook {
  const out: LessonProgressByBook = {};
  const bookIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const bookId of bookIds) {
    const la = a[bookId] ?? {};
    const lb = b[bookId] ?? {};
    const indices = new Set([
      ...Object.keys(la).map(Number),
      ...Object.keys(lb).map(Number),
    ]);
    out[bookId] = {};
    for (const idx of indices) {
      out[bookId][idx] = mergeLessonProgress(la[idx], lb[idx]);
    }
  }
  return out;
}

/** True once a lesson has any completion worth persisting to the cloud. */
function hasCompletion(p: LessonProgress): boolean {
  return p.learnCompletedAt != null || p.testCompletedAt != null;
}

// --- cloud wiring ----------------------------------------------------------

const toISO = (ms: number | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString();
const fromISO = (s: string | null): number | undefined =>
  s ? Date.parse(s) : undefined;

async function upsertRow(
  bookId: string,
  lessonIndex: number,
  progress: LessonProgress
): Promise<void> {
  if (!cloud || !hasCompletion(progress)) return;
  const { error } = await cloud.client.from("lesson_progress").upsert(
    {
      user_id: cloud.userId,
      book_id: bookId,
      lesson_number: lessonIndex + 1,
      learn_completed_at: toISO(progress.learnCompletedAt),
      test_completed_at: toISO(progress.testCompletedAt),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id,lesson_number" }
  );
  if (error) console.error("lesson_progress upsert failed", error);
}

/** All of this user's cloud lesson progress, as a local-shaped map. */
async function pullCloudLessons(): Promise<LessonProgressByBook> {
  if (!cloud) return {};
  const { data, error } = await cloud.client
    .from("lesson_progress")
    .select("book_id, lesson_number, learn_completed_at, test_completed_at")
    .eq("user_id", cloud.userId);
  if (error) {
    console.error("lesson_progress load failed", error);
    return {};
  }
  const map: LessonProgressByBook = {};
  for (const r of (data ?? []) as LessonProgressRow[]) {
    const idx = r.lesson_number - 1;
    const entry: LessonProgress = {};
    const learn = fromISO(r.learn_completed_at);
    const test = fromISO(r.test_completed_at);
    if (learn != null) entry.learnCompletedAt = learn;
    if (test != null) entry.testCompletedAt = test;
    (map[r.book_id] ??= {})[idx] = entry;
  }
  return map;
}

/**
 * Point lesson progress at a signed-in user's cloud. Registers the write
 * observer so each subsequent completion is pushed to Supabase.
 */
export function configureLessonCloud(client: SupabaseClient, userId: string): void {
  cloud = { client, userId };
  setLessonWriteObserver((bookId, lessonIndex, progress) => {
    void upsertRow(bookId, lessonIndex, progress).catch((e) =>
      console.error("lesson_progress push failed", e)
    );
  });
}

/** Detach from the cloud (logout). Local progress remains as an offline store. */
export function clearLessonCloud(): void {
  cloud = null;
  setLessonWriteObserver(null);
}

/**
 * Reconcile local and cloud progress: pull the cloud, union-merge with local,
 * write the merged result back to both. Conflict-free and idempotent. This both
 * migrates a first-login device's local progress up (cloud empty → all pushed)
 * and keeps a returning device in sync (cloud wins nothing is lost).
 */
export async function reconcileLessonProgress(): Promise<void> {
  if (!cloud) return;
  const cloudMap = await pullCloudLessons();
  const localMap = readAllLessons();
  const merged = mergeLessonMaps(localMap, cloudMap);
  writeAllLessons(merged); // update local cache (no observer → no push storm)

  // Push entries whose merged value differs from what the cloud already has.
  for (const [bookId, lessons] of Object.entries(merged)) {
    for (const [idxStr, p] of Object.entries(lessons)) {
      const idx = Number(idxStr);
      const c = cloudMap[bookId]?.[idx];
      const same =
        c &&
        c.learnCompletedAt === p.learnCompletedAt &&
        c.testCompletedAt === p.testCompletedAt;
      if (!same) await upsertRow(bookId, idx, p);
    }
  }
}

/** Discard local progress and replace it with the cloud's ("start fresh"). */
export async function overwriteLocalLessonsFromCloud(): Promise<void> {
  if (!cloud) return;
  writeAllLessons(await pullCloudLessons());
}

/** Delete a book's cloud lesson rows (used by "Restart Lessons" when signed in). */
export async function deleteCloudBookLessons(bookId: string): Promise<void> {
  if (!cloud) return;
  const { error } = await cloud.client
    .from("lesson_progress")
    .delete()
    .eq("user_id", cloud.userId)
    .eq("book_id", bookId);
  if (error) console.error("lesson_progress delete failed", error);
}
