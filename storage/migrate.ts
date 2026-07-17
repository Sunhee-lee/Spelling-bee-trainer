import type { AppSettings, AppState, Book, StreakState, Word } from "@/types";
import { createId } from "@/services/id";
import { DEFAULT_SETTINGS, STATE_VERSION, createInitialState } from "@/storage/seed";
import { EMPTY_STREAK } from "@/services/streak";

/**
 * Normalize an arbitrary persisted value into a valid {@link AppState}.
 *
 * This is the single place that upgrades older saved data to the current
 * schema. Notably, v1 words had no `number`; v2 assigns one per word based on
 * its position in the book. Unknown/corrupt input falls back to a fresh state.
 */
export function migrateState(raw: unknown): AppState {
  if (!isRecord(raw) || !Array.isArray(raw.books)) {
    return createInitialState();
  }

  const books = raw.books
    .filter(isRecord)
    .map((book, bookIndex) => migrateBook(book, bookIndex));

  return {
    version: STATE_VERSION,
    books,
    settings: migrateSettings(raw.settings),
    streak: migrateStreak(raw.streak),
  };
}

/** Normalize a persisted streak (older data has none → safe defaults). */
function migrateStreak(raw: unknown): StreakState {
  if (!isRecord(raw)) return { ...EMPTY_STREAK };
  const lastStudyDate =
    typeof raw.lastStudyDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastStudyDate)
      ? raw.lastStudyDate
      : null;
  return {
    currentStreak: toNonNegativeInt(raw.currentStreak, 0),
    longestStreak: toNonNegativeInt(raw.longestStreak, 0),
    lastStudyDate,
  };
}

function migrateBook(raw: Record<string, unknown>, bookIndex: number): Book {
  const words = Array.isArray(raw.words)
    ? raw.words.filter(isRecord).map((word, i) => migrateWord(word, i))
    : [];

  return {
    id: typeof raw.id === "string" ? raw.id : createId(),
    name: typeof raw.name === "string" ? raw.name : `Book ${bookIndex + 1}`,
    words,
    currentTest: toPositiveInt(raw.currentTest, 1),
    locked: raw.locked === true,
    unlockAfterBookId:
      typeof raw.unlockAfterBookId === "string" ? raw.unlockAfterBookId : null,
    builtIn: raw.builtIn === true,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
  };
}

function migrateWord(raw: Record<string, unknown>, index: number): Word {
  return {
    id: typeof raw.id === "string" ? raw.id : createId(),
    // v1 had no number — assign by position (1-based).
    number: toPositiveInt(raw.number, index + 1),
    word: typeof raw.word === "string" ? raw.word : "",
    meaning: typeof raw.meaning === "string" ? raw.meaning : "",
    mastered: raw.mastered === true,
    consecutiveCorrect: toNonNegativeInt(raw.consecutiveCorrect, 0),
    level: toNonNegativeInt(raw.level, 0),
    nextReviewTest: toNonNegativeInt(raw.nextReviewTest, 0),
  };
}

function migrateSettings(raw: unknown): AppSettings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS };
  return {
    questionsPerTest: toPositiveInt(
      raw.questionsPerTest,
      DEFAULT_SETTINGS.questionsPerTest
    ),
    masterReviewRate:
      typeof raw.masterReviewRate === "number" &&
      raw.masterReviewRate >= 0 &&
      raw.masterReviewRate <= 1
        ? raw.masterReviewRate
        : DEFAULT_SETTINGS.masterReviewRate,
    shuffleQuestions:
      typeof raw.shuffleQuestions === "boolean"
        ? raw.shuffleQuestions
        : DEFAULT_SETTINGS.shuffleQuestions,
    language:
      raw.language === "en" || raw.language === "ko"
        ? raw.language
        : DEFAULT_SETTINGS.language,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPositiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.round(value)
    : fallback;
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : fallback;
}
