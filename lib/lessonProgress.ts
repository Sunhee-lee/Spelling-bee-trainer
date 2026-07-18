import type { LessonProgress } from "@/services/lessons";

/**
 * Lightweight per-lesson progress for the Basic 100 lesson flow.
 *
 * Like {@link ./learnProgress}, this is deliberately minimal and lives in its
 * own LocalStorage key — no lesson table, no duplicated word data. It records
 * only the three timestamps needed to derive a lesson's status and unlock the
 * next one. It is not synced to the cloud (progression is a per-device study
 * convenience).
 */

const LESSONS_KEY = "spelling-bee-trainer/lessons";

/** bookId -> lessonIndex(string) -> progress */
type LessonsMap = Record<string, Record<string, LessonProgress>>;

/** Numeric-keyed view of the whole map, used by the cloud-sync layer. */
export type LessonProgressByBook = Record<string, Record<number, LessonProgress>>;

/**
 * Optional observer notified after a single lesson's progress changes (via the
 * mark* helpers). The cloud-sync layer registers this to push completions to
 * Supabase, without lessonProgress needing to know about Supabase. Bulk writes
 * (writeAllLessons) deliberately do NOT notify — the sync layer drives those.
 */
type WriteObserver = (
  bookId: string,
  lessonIndex: number,
  progress: LessonProgress
) => void;
let observer: WriteObserver | null = null;
export function setLessonWriteObserver(cb: WriteObserver | null): void {
  observer = cb;
}

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function readAll(): LessonsMap {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(LESSONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as LessonsMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: LessonsMap): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(LESSONS_KEY, JSON.stringify(map));
  } catch {
    // Progress is a convenience — ignore storage failures.
  }
}

/** All lesson progress for a book, keyed by numeric lesson index. */
export function readBookLessons(bookId: string): Record<number, LessonProgress> {
  if (!bookId) return {};
  const raw = readAll()[bookId] ?? {};
  const out: Record<number, LessonProgress> = {};
  for (const [k, v] of Object.entries(raw)) out[Number(k)] = v;
  return out;
}

function patch(bookId: string, lessonIndex: number, next: LessonProgress): void {
  if (!bookId) return;
  const map = readAll();
  const book = map[bookId] ?? {};
  const key = String(lessonIndex);
  book[key] = { ...book[key], ...next };
  map[bookId] = book;
  writeAll(map);
  observer?.(bookId, lessonIndex, book[key]);
}

/** The whole progress map (numeric lesson keys). Used by the cloud-sync layer. */
export function readAllLessons(): LessonProgressByBook {
  const raw = readAll();
  const out: LessonProgressByBook = {};
  for (const [bookId, lessons] of Object.entries(raw)) {
    out[bookId] = {};
    for (const [k, v] of Object.entries(lessons)) out[bookId][Number(k)] = v;
  }
  return out;
}

/** Replace the whole local cache (e.g. after reconciling with the cloud). */
export function writeAllLessons(map: LessonProgressByBook): void {
  const raw: LessonsMap = {};
  for (const [bookId, lessons] of Object.entries(map)) {
    raw[bookId] = {};
    for (const [k, v] of Object.entries(lessons)) raw[bookId][String(k)] = v;
  }
  writeAll(raw);
}

/** Mark that the learner opened this lesson's Learn session (→ "Learning"). */
export function markLessonLearnStarted(bookId: string, lessonIndex: number): void {
  const existing = readBookLessons(bookId)[lessonIndex];
  if (existing?.learnStartedAt) return; // keep the first timestamp
  patch(bookId, lessonIndex, { learnStartedAt: Date.now() });
}

/** Mark that the learner finished this lesson's Learn session. */
export function markLessonLearnCompleted(bookId: string, lessonIndex: number): void {
  const existing = readBookLessons(bookId)[lessonIndex];
  patch(bookId, lessonIndex, {
    learnStartedAt: existing?.learnStartedAt ?? Date.now(),
    learnCompletedAt: existing?.learnCompletedAt ?? Date.now(),
  });
}

/** Mark that the learner finished this lesson's Spelling Test (→ "Completed"). */
export function markLessonTestCompleted(bookId: string, lessonIndex: number): void {
  const existing = readBookLessons(bookId)[lessonIndex];
  patch(bookId, lessonIndex, {
    testCompletedAt: existing?.testCompletedAt ?? Date.now(),
  });
}

/** Clear all lesson progress for a book ("start over from the beginning"). */
export function resetBookLessons(bookId: string): void {
  if (!bookId) return;
  const map = readAll();
  if (bookId in map) {
    delete map[bookId];
    writeAll(map);
  }
}
