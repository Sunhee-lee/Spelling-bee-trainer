import type { Word } from "@/types";

/**
 * Lightweight, per-book *Learn* progress.
 *
 * This is deliberately kept **separate** from the SRS test system: viewing
 * flashcards must never touch a word's mastery, the daily streak, or the test
 * history. It lives in its own LocalStorage key and is **never synced** to the
 * cloud — it's just a "resume where you left off" convenience on this device.
 */

const LEARN_KEY = "spelling-bee-trainer/learn";

export interface BookLearnProgress {
  /** Index of the last card the learner viewed (0-based). */
  lastLearnedIndex: number;
  /** Id of the last word viewed — the primary, order-stable resume anchor. */
  lastLearnedWordId: string | null;
  /** Epoch ms of the last time this book was studied. */
  lastLearnedAt: number;
  /** Epoch ms of the first time the learner reached the end, else null. */
  completedAt: number | null;
}

type LearnProgressMap = Record<string, BookLearnProgress>;

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function readAll(): LearnProgressMap {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(LEARN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as LearnProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: LearnProgressMap): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(LEARN_KEY, JSON.stringify(map));
  } catch {
    // Storage full / unavailable — progress is a convenience, so ignore.
  }
}

/** Read the saved Learn progress for a book, or null if none. */
export function readLearnProgress(bookId: string): BookLearnProgress | null {
  if (!bookId) return null;
  return readAll()[bookId] ?? null;
}

/** Persist Learn progress for a book (merges into the shared map). */
export function writeLearnProgress(
  bookId: string,
  progress: BookLearnProgress
): void {
  if (!bookId) return;
  const map = readAll();
  map[bookId] = progress;
  writeAll(map);
}

/** Remove the saved Learn progress for a book. */
export function clearLearnProgress(bookId: string): void {
  if (!bookId) return;
  const map = readAll();
  if (bookId in map) {
    delete map[bookId];
    writeAll(map);
  }
}

/**
 * Decide which card to open on entry, resuming where the learner left off.
 *
 * A session that was already finished re-opens from the FIRST card — re-entering
 * it (e.g. "Learn Again" on a completed lesson) is a review from the top, not a
 * resume. An unfinished session resumes: match the saved word id first (robust
 * to reordering / added / removed words), then the saved index (clamped), then
 * the first card. Pure so it can be unit-tested.
 */
export function resolveStartIndex(
  words: Pick<Word, "id">[],
  progress: BookLearnProgress | null
): number {
  if (words.length === 0) return 0;
  if (!progress) return 0;

  // Completed → start the review from card 1.
  if (progress.completedAt != null) return 0;

  if (progress.lastLearnedWordId) {
    const byId = words.findIndex((w) => w.id === progress.lastLearnedWordId);
    if (byId >= 0) return byId;
  }

  if (
    typeof progress.lastLearnedIndex === "number" &&
    Number.isFinite(progress.lastLearnedIndex) &&
    progress.lastLearnedIndex >= 0
  ) {
    return Math.min(Math.floor(progress.lastLearnedIndex), words.length - 1);
  }

  return 0;
}
