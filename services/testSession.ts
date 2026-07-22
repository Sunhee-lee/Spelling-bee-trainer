import type { AppSettings, Book, TestQuestion, Word } from "@/types";

/** Return a new array with the elements shuffled (Fisher–Yates). */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build the list of words for Today's Practice, by priority:
 *   1. Review   — not mastered and due now (nextReviewTest <= currentTest)
 *   2. Learning — not mastered and not yet due
 *   3. Spaced review — mastered words whose spaced-repetition interval is due
 *      now (nextReviewTest <= currentTest).
 *
 * Mastered words are excluded by default and resurface ONLY when their SRS
 * review is due — so practice stays focused on words still being learned while
 * mastered words come back rarely, at growing intervals, to guard against
 * forgetting. There is no random master sample. The test is never padded to
 * reach `questionsPerTest` — a small book simply yields a shorter test.
 *
 * As a special case, a fully-mastered book with nothing due still runs a
 * maintenance review of its mastered words (otherwise "Start Test" would do
 * nothing).
 */
export function buildTestWords(book: Book, settings: AppSettings): Word[] {
  const { questionsPerTest, shuffleQuestions } = settings;

  const order = (words: Word[]): Word[] =>
    shuffleQuestions
      ? shuffle(words)
      : [...words].sort((a, b) => a.number - b.number);

  const isDue = (w: Word) => w.nextReviewTest <= book.currentTest;

  const notMastered = book.words.filter((w) => !w.mastered);
  const dueLearning = order(notMastered.filter(isDue));
  const notDueLearning = order(notMastered.filter((w) => !isDue(w)));
  // Mastered words resurface only when their spaced-review interval is due.
  const masteredDue = order(book.words.filter((w) => w.mastered && isDue(w)));

  const capacity = questionsPerTest > 0 ? questionsPerTest : book.words.length;

  // Learning first (due, then ahead), then due spaced-reviews of mastered words.
  let queue = [...dueLearning, ...notDueLearning, ...masteredDue];

  // Fully-mastered book with nothing due → maintenance review of mastered words
  // so the test is never empty.
  if (queue.length === 0) {
    queue = order(book.words.filter((w) => w.mastered));
  }

  const questions = queue.slice(0, capacity);
  return shuffleQuestions ? shuffle(questions) : questions;
}

/** Order words by the "Shuffle Practice Words" setting: shuffled, or by number. */
function orderByShuffle(words: readonly Word[], shuffleQuestions: boolean): Word[] {
  return shuffleQuestions
    ? shuffle(words)
    : [...words].sort((a, b) => a.number - b.number);
}

/**
 * Full Test: every word in the book, exactly once, regardless of mastery. Order
 * follows the "Shuffle Practice Words" setting (shuffled when on, else by
 * number). Used for the pre-competition "check everything" run.
 */
export function buildFullTestWords(book: Book, settings: AppSettings): Word[] {
  return orderByShuffle(book.words, settings.shuffleQuestions);
}

/** A shuffled review of just the mastered words (optional master check). */
export function buildMasterReviewWords(book: Book): Word[] {
  return shuffle(book.words.filter((w) => w.mastered));
}

/**
 * A lesson test: every word in the lesson, exactly once. Order follows the
 * "Shuffle Practice Words" setting (shuffled when on, else by number).
 */
export function buildLessonTestWords(
  words: readonly Word[],
  settings: AppSettings
): Word[] {
  return orderByShuffle(words, settings.shuffleQuestions);
}

/**
 * Pick the given word ids from the book, shuffled. Used to re-test only the
 * words missed in the previous run (wrong-answer retry).
 */
export function pickWordsByIds(book: Book, ids: readonly string[]): Word[] {
  const wanted = new Set(ids);
  return shuffle(book.words.filter((w) => wanted.has(w.id)));
}

/** Wrap words as ungraded test questions. */
export function toQuestions(words: Word[]): TestQuestion[] {
  return words.map((word) => ({ word, result: null }));
}
