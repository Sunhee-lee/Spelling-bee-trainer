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
