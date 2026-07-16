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
 *   1. Review  — not mastered and due now (nextReviewTest <= currentTest)
 *   2. Learning — not mastered and not yet due
 *   3. Master check — a ~`masterReviewRate` sample of mastered words, mixed in
 *      so they aren't forgotten (mastered words are otherwise excluded).
 *
 * The test is capped at `questionsPerTest`. When `shuffleQuestions` is on,
 * each group is shuffled and the final order is shuffled too; otherwise words
 * keep a stable order (by number) and groups stay in priority order.
 */
export function buildTestWords(book: Book, settings: AppSettings): Word[] {
  const { questionsPerTest, masterReviewRate, shuffleQuestions } = settings;

  const order = (words: Word[]): Word[] =>
    shuffleQuestions
      ? shuffle(words)
      : [...words].sort((a, b) => a.number - b.number);

  const notMastered = book.words.filter((w) => !w.mastered);
  const mastered = book.words.filter((w) => w.mastered);

  const due = order(notMastered.filter((w) => w.nextReviewTest <= book.currentTest));
  const notDue = order(notMastered.filter((w) => w.nextReviewTest > book.currentTest));

  const total = questionsPerTest > 0 ? questionsPerTest : book.words.length;

  // Reserve ~masterReviewRate of the test for master-check words.
  const masterSlots = Math.min(
    Math.round(total * masterReviewRate),
    mastered.length
  );
  const nonMasterNeeded = Math.max(0, total - masterSlots);

  const nonMasterPicked = [...due, ...notDue].slice(0, nonMasterNeeded);
  // Any slots the non-mastered pool couldn't fill go to more master words.
  const masterNeeded = total - nonMasterPicked.length;
  const masterPicked = order(mastered).slice(0, masterNeeded);

  const questions = [...nonMasterPicked, ...masterPicked];
  return shuffleQuestions ? shuffle(questions) : questions;
}

/** Wrap words as ungraded test questions. */
export function toQuestions(words: Word[]): TestQuestion[] {
  return words.map((word) => ({ word, result: null }));
}
