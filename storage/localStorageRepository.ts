import type { AppState } from "@/types";
import type { StorageRepository, TestSessionRecord } from "@/storage/repository";
import { migrateState } from "@/storage/migrate";

const STORAGE_KEY = "spelling-bee-trainer/state";
const HISTORY_KEY = "spelling-bee-trainer/history";
const HISTORY_CAP = 200;

/**
 * LocalStorage-backed implementation of {@link StorageRepository}. Used when
 * the user is signed out (offline mode). Safe during SSR (no `window`).
 */
export class LocalStorageRepository implements StorageRepository {
  private readonly key: string;

  constructor(key: string = STORAGE_KEY) {
    this.key = key;
  }

  private available(): boolean {
    return typeof window !== "undefined" && !!window.localStorage;
  }

  async load(): Promise<AppState | null> {
    if (!this.available()) return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      // Normalize any older schema (e.g. words without `number`) on load.
      return migrateState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Synchronous check used by the login migration flow. */
  hasData(): boolean {
    if (!this.available()) return false;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return false;
      const state = migrateState(JSON.parse(raw));
      return state.books.some((b) => b.words.length > 0);
    } catch {
      return false;
    }
  }

  async save(state: AppState): Promise<void> {
    if (!this.available()) return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // Quota exceeded or storage disabled — ignore.
    }
  }

  async clear(): Promise<void> {
    if (!this.available()) return;
    try {
      window.localStorage.removeItem(this.key);
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore.
    }
  }

  async recordSession(session: TestSessionRecord): Promise<void> {
    if (!this.available()) return;
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      const history: unknown[] = raw ? JSON.parse(raw) : [];
      history.push({ ...session, createdAt: Date.now() });
      const trimmed = history.slice(-HISTORY_CAP);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore.
    }
  }
}
