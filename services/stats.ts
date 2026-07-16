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
