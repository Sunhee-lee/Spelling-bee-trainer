import type { Book, BookStats } from "@/types";

/**
 * Derive dashboard counts for a book. The three buckets are disjoint and sum
 * to `total`:
 *   - mastered: consecutiveCorrect reached the master threshold
 *   - review:   not mastered and due now (nextReviewTest <= currentTest)
 *   - learning: not mastered and not yet due
 */
export function computeBookStats(book: Book): BookStats {
  const total = book.words.length;
  const mastered = book.words.filter((w) => w.mastered).length;
  const review = book.words.filter(
    (w) => !w.mastered && w.nextReviewTest <= book.currentTest
  ).length;
  const learning = total - mastered - review;
  const progress = total === 0 ? 0 : Math.round((mastered / total) * 100);

  return { total, mastered, learning, review, progress };
}

/** True once every word in the book is mastered (drives Supplemental unlock). */
export function isBookComplete(book: Book): boolean {
  return book.words.length > 0 && book.words.every((w) => w.mastered);
}

/** How many words a single "오늘의 연습" session covers by default. */
export const TODAY_PRACTICE_SIZE = 20;
/** At or below this many words left, switch to the "almost there" nudge. */
const ALMOST_DONE_THRESHOLD = 5;

/**
 * State-based next action for a general (non-lesson) book, so the dashboard can
 * always tell the learner what to actually do next — the counterpart of
 * `nextLessonGoal` for Basic 100. Priority: done → final stretch → practice.
 */
export type BookGuide =
  | { kind: "empty" }
  | { kind: "allMastered" }
  | { kind: "almost"; count: number }
  | { kind: "practice"; count: number };

export function bookGuide(book: Book): BookGuide {
  const { total, mastered } = computeBookStats(book);
  if (total === 0) return { kind: "empty" };
  const remaining = total - mastered;
  if (remaining === 0) return { kind: "allMastered" };
  if (remaining <= ALMOST_DONE_THRESHOLD) return { kind: "almost", count: remaining };
  return { kind: "practice", count: Math.min(remaining, TODAY_PRACTICE_SIZE) };
}

/**
 * Recompute the `locked` flag for books that depend on another book being
 * complete (e.g. the Supplemental List unlocks once Basic 100 is fully
 * mastered).
 *
 * Unlocking is a latch during normal play — once open it stays open. Pass
 * `allowRelock` (used by progress resets) to also re-lock a dependent book
 * whose prerequisite is no longer complete.
 */
export function applyLocks(books: Book[], allowRelock: boolean): Book[] {
  return books.map((book) => {
    if (!book.unlockAfterBookId) return book;
    const prerequisite = books.find((b) => b.id === book.unlockAfterBookId);
    const complete = prerequisite ? isBookComplete(prerequisite) : false;

    if (complete && book.locked) return { ...book, locked: false };
    if (!complete && !book.locked && allowRelock) {
      return { ...book, locked: true };
    }
    return book;
  });
}
