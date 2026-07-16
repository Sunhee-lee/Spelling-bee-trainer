import type { Book, BookStats } from "@/types";

/**
 * Derive dashboard counts for a book.
 *
 * In Phase 1 no words are mastered yet (grading is Phase 2), so `learning`
 * will equal `total` and `progress` will be 0. The computation is written
 * against the real SRS fields so the dashboard "just works" once Phase 2 lands.
 */
export function computeBookStats(book: Book): BookStats {
  const total = book.words.length;
  const mastered = book.words.filter((w) => w.mastered).length;
  const learning = total - mastered;
  const review = book.words.filter(
    (w) => !w.mastered && w.nextReviewTest <= book.currentTest
  ).length;
  const progress = total === 0 ? 0 : Math.round((mastered / total) * 100);

  return { total, mastered, learning, review, progress };
}

/** True once every word in the book is mastered (drives Supplemental unlock in Phase 2). */
export function isBookComplete(book: Book): boolean {
  return book.words.length > 0 && book.words.every((w) => w.mastered);
}
