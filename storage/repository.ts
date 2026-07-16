import type { AppState } from "@/types";

/**
 * Persistence boundary for the whole app state.
 *
 * The rest of the app depends only on this interface, never on LocalStorage
 * directly. To migrate to Supabase/Firebase later, implement this interface
 * with the new backend and swap the concrete instance in `storage/index.ts`.
 */
export interface StateRepository {
  /** Load the persisted state, or null if nothing has been saved yet. */
  load(): AppState | null;
  /** Persist the full state. */
  save(state: AppState): void;
  /** Remove all persisted state. */
  clear(): void;
}
