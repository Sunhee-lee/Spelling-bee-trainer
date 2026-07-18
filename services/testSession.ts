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
 * Build the list of words for a test, by priority:
 *   1. Review   — not mastered and due now (nextReviewTest <= currentTest)
 *   2. Learning — not mastered and not yet due
 *   3. Master check — a small anti-forgetting sample of mastered words.
 *
 * Mastered words are otherwise excluded from normal tests. The master-check
 * is `round(masteredCount * masterReviewRate)`, but never more than the room
 * left after the non-mastered words are placed (so learning always comes
 * first). The test is never padded with mastered words to reach
 * `questionsPerTest` — a small book simply yields a shorter test.
 *
 * As a special case, a fully-mastered book runs a maintenance review of its
 * mastered words (otherwise "Start Test" would do nothing).
 */
export function buildTestWords(book: Book, settings: AppSettings): Word[] {
  const { questionsPerTest, masterReviewRate, shuffleQuestions } = settings;

  const order = (words: Word[]): Word[] =>
    shuffleQuestions
      ? shuffle(words)
      : [...words].sort((a, b) => a.number - b.number);

  const mastered = book.words.filter((w) => w.mastered);
  const notMastered = book.words.filter((w) => !w.mastered);

  const due = order(notMastered.filter((w) => w.nextReviewTest <= book.currentTest));
  const notDue = order(notMastered.filter((w) => w.nextReviewTest > book.currentTest));
  const nonMastered = [...due, ...notDue];

  const capacity = questionsPerTest > 0 ? questionsPerTest : book.words.length;

  let learning: Word[];
  let masterCheck: number;
  if (nonMastered.length === 0) {
    // Everything is mastered — review the mastered words to keep them fresh.
    learning = [];
    masterCheck = Math.min(capacity, mastered.length);
  } else {
    learning = nonMastered.slice(0, capacity);
    const room = capacity - learning.length;
    masterCheck = Math.min(
      Math.round(mastered.length * masterReviewRate),
      mastered.length,
      room
    );
  }

  const masterPicked = order(mastered).slice(0, masterCheck);
  const questions = [...learning, ...masterPicked];
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
