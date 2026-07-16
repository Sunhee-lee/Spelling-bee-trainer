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
 * Build the list of words for a test.
 *
 * Phase 1: a simple pool of the book's words, optionally shuffled and capped
 * at `questionsPerTest`. The priority queue (review words, then learning words,
 * then a ~10% sample of mastered words) is Phase 2 — this function is the seam
 * where that logic will slot in.
 */
export function buildTestWords(book: Book, settings: AppSettings): Word[] {
  const pool = settings.shuffleQuestions ? shuffle(book.words) : [...book.words];
  const cap = settings.questionsPerTest;
  return cap > 0 ? pool.slice(0, cap) : pool;
}

/** Wrap words as ungraded test questions. */
export function toQuestions(words: Word[]): TestQuestion[] {
  return words.map((word) => ({ word, result: null }));
}
