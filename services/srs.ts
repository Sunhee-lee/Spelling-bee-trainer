import type { Word } from "@/types";
import { createId } from "@/services/id";

/**
 * Test-based spaced-repetition intervals, indexed by level.
 *
 *   Level 0 -> review this test
 *   Level 1 -> next test
 *   Level 2 -> after 2 tests
 *   Level 3 -> after 4 tests
 *   Level 4 -> after 8 tests
 *   Level 5 -> after 16 tests
 */
export const REVIEW_INTERVALS = [0, 1, 2, 4, 8, 16] as const;

/** Highest valid level (last index into {@link REVIEW_INTERVALS}). */
export const MAX_LEVEL = REVIEW_INTERVALS.length - 1;

/** Consecutive correct answers required for a word to become mastered. */
export const MASTER_THRESHOLD = 4;

export type Grade = "correct" | "wrong";

/**
 * Apply a grade to a word and return the updated word (pure — no mutation).
 *
 * Correct: streak +1, level +1 (capped), scheduled `interval[level]` tests
 * ahead, and mastered once the streak reaches {@link MASTER_THRESHOLD}.
 *
 * Wrong: streak and level reset, mastery cleared, and the word becomes due
 * immediately (nextReviewTest = currentTest) so it returns to the queue.
 */
export function gradeWord(
  word: Word,
  currentTest: number,
  grade: Grade
): Word {
  if (grade === "wrong") {
    return {
      ...word,
      consecutiveCorrect: 0,
      mastered: false,
      level: 0,
      nextReviewTest: currentTest,
    };
  }

  const consecutiveCorrect = word.consecutiveCorrect + 1;
  const level = Math.min(word.level + 1, MAX_LEVEL);
  return {
    ...word,
    consecutiveCorrect,
    level,
    mastered: word.mastered || consecutiveCorrect >= MASTER_THRESHOLD,
    nextReviewTest: currentTest + REVIEW_INTERVALS[level],
  };
}

/**
 * Create a fresh word with default SRS state.
 * `nextReviewTest: 0` makes a new word eligible from the very first test.
 *
 * NOTE: the grading/scheduling logic that mutates these fields is Phase 2.
 * Phase 1 only creates words with correct defaults and reads them back.
 */
export function createWord(number: number, word: string, meaning: string): Word {
  return {
    id: createId(),
    number,
    word: word.trim(),
    meaning: meaning.trim(),
    mastered: false,
    consecutiveCorrect: 0,
    level: 0,
    nextReviewTest: 0,
  };
}
