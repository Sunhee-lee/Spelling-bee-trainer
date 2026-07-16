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

/** Consecutive correct answers required for a word to become mastered. */
export const MASTER_THRESHOLD = 4;

/**
 * Create a fresh word with default SRS state.
 * `nextReviewTest: 0` makes a new word eligible from the very first test.
 *
 * NOTE: the grading/scheduling logic that mutates these fields is Phase 2.
 * Phase 1 only creates words with correct defaults and reads them back.
 */
export function createWord(word: string, meaning: string): Word {
  return {
    id: createId(),
    word: word.trim(),
    meaning: meaning.trim(),
    mastered: false,
    consecutiveCorrect: 0,
    level: 0,
    nextReviewTest: 0,
  };
}
