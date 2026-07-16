import type { AppState } from "@/types";

/** A finished test to append to history (Test History sync). */
export interface TestSessionRecord {
  bookId: string;
  score: number;
  correct: number;
  wrong: number;
  answers: { wordId: string; correct: boolean }[];
}

/**
 * Persistence boundary for the whole app state. The UI/store depend only on
 * this interface — never on LocalStorage or Supabase directly. Swap the
 * concrete implementation (LocalStorage ↔ Supabase) to change backends.
 *
 * All methods are async so the same interface works for a remote backend.
 */
export interface StorageRepository {
  /** Load the persisted state as a ready-to-use AppState, or null if empty. */
  load(): Promise<AppState | null>;
  /** Persist the full state. */
  save(state: AppState): Promise<void>;
  /** Remove all persisted app state for this backend. */
  clear(): Promise<void>;
  /** Append a finished test to history. Optional; no-op backends may omit it. */
  recordSession?(session: TestSessionRecord): Promise<void>;
}
