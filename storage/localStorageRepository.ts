import type { AppState } from "@/types";
import type { StateRepository } from "@/storage/repository";

const STORAGE_KEY = "spelling-bee-trainer/state";

/**
 * LocalStorage-backed implementation of {@link StateRepository}.
 *
 * All access is guarded so it is safe to instantiate during server-side
 * rendering (where `window` is undefined) — it simply behaves as empty storage.
 */
export class LocalStorageRepository implements StateRepository {
  private readonly key: string;

  constructor(key: string = STORAGE_KEY) {
    this.key = key;
  }

  private available(): boolean {
    return typeof window !== "undefined" && !!window.localStorage;
  }

  load(): unknown {
    if (!this.available()) return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      // Corrupt or unreadable data — treat as empty rather than crashing.
      return null;
    }
  }

  save(state: AppState): void {
    if (!this.available()) return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // Quota exceeded or storage disabled — silently ignore for now.
    }
  }

  clear(): void {
    if (!this.available()) return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // Ignore.
    }
  }
}
