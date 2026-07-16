/**
 * Core domain types for Spelling Bee Trainer.
 *
 * These types describe the persisted shape of the app. They are intentionally
 * storage-agnostic so the data can later move from LocalStorage to
 * Supabase/Firebase without touching UI or business logic.
 */

/** A single vocabulary entry. */
export interface Word {
  id: string;
  /**
   * The word's position on the original (printed) vocabulary sheet, shown
   * throughout the app so parents can match it to paper. Auto-assigned when
   * imported without an explicit number.
   */
  number: number;
  /** The English word, e.g. "journey". */
  word: string;
  /** The Korean meaning, e.g. "여행". */
  meaning: string;
  /** True once the word has been answered correctly 4 times in a row (Phase 2). */
  mastered: boolean;
  /** Consecutive correct answers; drives the Master system (Phase 2). */
  consecutiveCorrect: number;
  /** SRS level, index into the review intervals table (Phase 2). */
  level: number;
  /** The test number at which this word becomes eligible for review (Phase 2). */
  nextReviewTest: number;
}

/**
 * A vocabulary book owns a set of words and its own test counter.
 * The SRS is test-based, not date-based: eligibility is `nextReviewTest <= currentTest`.
 */
export interface Book {
  id: string;
  name: string;
  words: Word[];
  /** Monotonic counter of tests taken for this book. Starts at 1. */
  currentTest: number;
  /** Whether the book is locked from testing (e.g. the Supplemental List). */
  locked: boolean;
  /**
   * When set, this book unlocks once every word in the referenced book is
   * mastered. The unlock logic itself lands in Phase 2.
   */
  unlockAfterBookId: string | null;
  /** Whether the book may be renamed/deleted by the user. Seed books are protected. */
  builtIn: boolean;
  createdAt: number;
}

/** Supported UI languages. */
export type Language = "ko" | "en";

/** User-configurable test behaviour. UI for these lands in Phase 2/3. */
export interface AppSettings {
  /** Target number of questions per test. */
  questionsPerTest: number;
  /** Fraction of mastered words mixed into a test to prevent forgetting (Phase 2). */
  masterReviewRate: number;
  /** Whether questions are shuffled. */
  shuffleQuestions: boolean;
  /** UI language. Defaults to Korean. */
  language: Language;
}

/** The complete persisted application state. */
export interface AppState {
  /** Schema version, for future migrations. */
  version: number;
  books: Book[];
  settings: AppSettings;
}

/** A word queued into an in-progress test, paired with its grade. */
export interface TestQuestion {
  word: Word;
  /** null = not yet graded. */
  result: "correct" | "wrong" | null;
}

/** Aggregated per-book counts for the dashboard. */
export interface BookStats {
  total: number;
  mastered: number;
  /** Not mastered. */
  learning: number;
  /** Eligible for review now (nextReviewTest <= currentTest). */
  review: number;
  /** 0–100, percentage of words mastered. */
  progress: number;
}
