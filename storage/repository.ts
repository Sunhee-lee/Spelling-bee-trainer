import type { AppState } from "@/types";

/**
 * Persistence boundary for the whole app state.
 *
 * The rest of the app depends only on this interface, never on LocalStorage
 * directly. To migrate to Supabase/Firebase later, implement this interface
 * with the new backend and swap the concrete instance in `storage/index.ts`.
 */
export interface StateRepository {
  /**
   * Load the raw persisted value, or null if nothing has been saved yet.
   * Returns `unknown` because the stored shape may predate the current schema;
   * callers run it through {@link migrateState} before use.
   */
  load(): unknown;
  /** Persist the full state. */
  save(state: AppState): void;
  /** Remove all persisted state. */
  clear(): void;
}
