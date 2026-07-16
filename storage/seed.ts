import type { AppState, Book } from "@/types";
import { createId } from "@/services/id";

export const STATE_VERSION = 1;

export const DEFAULT_SETTINGS: AppState["settings"] = {
  questionsPerTest: 20,
  masterReviewRate: 0.1,
  shuffleQuestions: true,
};

/**
 * Build the initial app state on first run.
 *
 * Two books exist to start with:
 *   1. "Basic 100"        — the main list, unlocked.
 *   2. "Supplemental List" — locked until every word in Basic 100 is mastered
 *                            (the unlock logic itself is Phase 2).
 *
 * Books start empty; parents fill them via manual entry or Bulk Import.
 */
export function createInitialState(): AppState {
  const basic: Book = {
    id: createId(),
    name: "Basic 100",
    words: [],
    currentTest: 1,
    locked: false,
    unlockAfterBookId: null,
    builtIn: true,
    createdAt: 0,
  };

  const supplemental: Book = {
    id: createId(),
    name: "Supplemental List",
    words: [],
    currentTest: 1,
    locked: true,
    unlockAfterBookId: basic.id,
    builtIn: true,
    createdAt: 0,
  };

  return {
    version: STATE_VERSION,
    books: [basic, supplemental],
    settings: { ...DEFAULT_SETTINGS },
  };
}
