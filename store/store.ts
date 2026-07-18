import type { AppSettings, AppState, Book, StreakState, Word } from "@/types";
import type { ParsedEntry } from "@/services/vocabIO";
import type {
  StorageRepository,
  StoredSession,
  TestSessionRecord,
} from "@/storage/repository";
import { LocalStorageRepository } from "@/storage/localStorageRepository";
import { SupabaseRepository } from "@/storage/supabaseRepository";
import { createInitialState } from "@/storage/seed";
import { migrateState } from "@/storage/migrate";

/**
 * Durable local buffer of unsynced signed-in changes. Written on every commit
 * while the cloud is the active backend and cleared once the cloud write is
 * confirmed. On reload it lets us restore changes whose cloud write never
 * landed (fast refresh, transient failure) instead of losing them — and it
 * prevents (possibly empty/stale) cloud data from clobbering local work.
 */
const PENDING_KEY = "spelling-bee-trainer/pending";

/** Result of a cloud sync attempt, broadcast to UI listeners. */
export type SyncStatus = { ok: true } | { ok: false; error: unknown };
import { createId } from "@/services/id";
import { createWord, gradeWord, type Grade } from "@/services/srs";
import { applyLocks } from "@/services/stats";
import { applyStudyDay } from "@/services/streak";

export type ImportStrategy = "skip" | "replace";

export interface ImportSummary {
  imported: number;
  replaced: number;
  skipped: number;
}

/** Next display number for a book: one past the current maximum (1 if empty). */
function nextNumber(words: readonly Word[]): number {
  return words.reduce((max, w) => Math.max(max, w.number), 0) + 1;
}

/** Return a book with its learning progress cleared (words kept). */
function resetProgress(book: Book): Book {
  return {
    ...book,
    currentTest: 1,
    words: book.words.map((w) => ({
      ...w,
      mastered: false,
      consecutiveCorrect: 0,
      level: 0,
      nextReviewTest: 0,
    })),
  };
}

type Listener = () => void;

/**
 * In-memory, subscribable store for the whole app state.
 *
 * It owns the single source of truth, persists every change through a
 * {@link StateRepository}, and notifies React via `useSyncExternalStore`.
 * All mutations are immutable (new objects) so snapshots stay referentially
 * stable between changes.
 */
export class VocabStore {
  private repo: StorageRepository;
  private state: AppState;
  private listeners = new Set<Listener>();
  private hydrated = false;
  private hydrating = false;
  /** Guards against a stale (superseded) load overwriting a newer one. */
  private loadToken = 0;
  /**
   * Device-local mirror of test history. When signed in, cloud writes can fail
   * silently (misconfigured DB, RLS, offline blip); this keeps statistics
   * working from a local copy. When signed out the active repo already is
   * LocalStorage, so we never double-write to it.
   */
  private readonly localHistory = new LocalStorageRepository();
  /** UI subscribers for cloud-sync success/failure (for error toasts). */
  private syncListeners = new Set<(status: SyncStatus) => void>();

  constructor(repo: StorageRepository) {
    this.repo = repo;
    // Deterministic pre-hydration snapshot for SSR + first client paint.
    this.state = createInitialState();
    this.attachSyncListener();
  }

  // --- cloud-sync durability + status --------------------------------------

  /** The signed-in user's id when the cloud is the active backend, else null. */
  private cloudUserId(): string | null {
    return this.repo instanceof SupabaseRepository ? this.repo.userId : null;
  }

  /** Wire the active repo's flush result to the durable buffer + UI status. */
  private attachSyncListener(): void {
    if (this.repo instanceof SupabaseRepository) {
      this.repo.onSyncSettled = (error) => {
        if (error == null) {
          this.clearPending();
          this.notifySync({ ok: true });
        } else {
          this.notifySync({ ok: false, error });
        }
      };
    }
  }

  private writePending(state: AppState): void {
    const uid = this.cloudUserId();
    if (uid == null || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ userId: uid, state })
      );
    } catch {
      // Storage disabled/quota — best effort.
    }
  }

  private clearPending(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(PENDING_KEY);
    } catch {
      // Ignore.
    }
  }

  /** Unsynced buffered state for `uid`, or null if none/mismatched/corrupt. */
  private readPending(uid: string): AppState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { userId?: unknown; state?: unknown };
      if (parsed?.userId === uid && parsed.state) {
        return migrateState(parsed.state);
      }
    } catch {
      // Corrupt buffer — ignore.
    }
    return null;
  }

  /** Subscribe to cloud-sync results (success/failure). Returns unsubscribe. */
  subscribeSync = (cb: (status: SyncStatus) => void): (() => void) => {
    this.syncListeners.add(cb);
    return () => {
      this.syncListeners.delete(cb);
    };
  };

  private notifySync(status: SyncStatus): void {
    this.syncListeners.forEach((l) => l(status));
  }

  /** Re-attempt the cloud write of the current state (used by the retry UI). */
  retrySync(): void {
    void this.repo.save(this.state);
  }

  /** Best-effort: push any debounced cloud write immediately (e.g. on unload). */
  flushPendingSync(): void {
    const r = this.repo as { flushNow?: () => Promise<unknown> };
    void r.flushNow?.();
  }

  /**
   * Manually upload this device's offline data to the cloud (signed-in only).
   *
   * When a signed-in user has learning data that only lives in this device's
   * LocalStorage — created offline, or kept after choosing "Start fresh" at
   * first login — it never reaches the cloud on its own. This pushes that local
   * copy up (replacing the cloud with it) so it syncs across devices and shows
   * in the admin totals. Returns the outcome so the UI can report it.
   */
  async uploadDeviceDataToCloud(): Promise<"ok" | "empty" | "error" | "offline"> {
    if (!(this.repo instanceof SupabaseRepository)) return "offline";
    const localState = await new LocalStorageRepository().load();
    const wordCount = localState
      ? localState.books.reduce((n, b) => n + b.words.length, 0)
      : 0;
    if (!localState || wordCount === 0) return "empty";
    this.commit(localState);
    const ok = await this.repo.flushNow();
    return ok ? "ok" : "error";
  }

  // --- useSyncExternalStore wiring -----------------------------------------

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): AppState => this.state;

  isHydrated = (): boolean => this.hydrated;

  /** Load persisted state from the active repository. Safe to call repeatedly. */
  hydrate = async (): Promise<void> => {
    if (this.hydrated || this.hydrating) return;
    this.hydrating = true;
    await this.load();
    this.hydrated = true;
    this.hydrating = false;
    this.emit();
  };

  private async load(): Promise<void> {
    const token = ++this.loadToken;
    const repo = this.repo;
    let loaded: AppState | null = null;
    try {
      loaded = await repo.load();
    } catch (err) {
      console.error("Failed to load state", err);
    }
    // A newer load (e.g. a repository swap) started while we awaited — discard.
    if (token !== this.loadToken) return;

    // Reconcile unsynced local work first: if the cloud write of an earlier
    // change never confirmed, the durable buffer holds it. Restore it (never
    // let cloud — possibly empty or stale — clobber unsynced local data) and
    // re-attempt the sync.
    const uid = this.cloudUserId();
    const pending = uid ? this.readPending(uid) : null;
    if (pending) {
      this.state = { ...pending, books: applyLocks(pending.books, false) };
      void this.repo.save(this.state);
      return;
    }

    if (loaded) {
      // Apply the one-way unlock latch so a restored/complete state is
      // consistent (never re-locks).
      this.state = { ...loaded, books: applyLocks(loaded.books, false) };
      void this.repo.save(this.state);
    } else {
      // First run for this backend — persist the seeded state.
      this.state = createInitialState();
      void this.repo.save(this.state);
    }
  }

  /**
   * Swap the storage backend (e.g. LocalStorage ↔ Supabase on login/logout)
   * and reload from it. The `hydrated` flag stays true so the UI keeps
   * rendering; only the data source changes.
   */
  async setRepository(repo: StorageRepository): Promise<void> {
    this.repo = repo;
    this.attachSyncListener();
    // Leaving the cloud (logout) → drop any buffered cloud-only changes so they
    // never leak into a later session/user.
    if (!(repo instanceof SupabaseRepository)) this.clearPending();
    await this.load();
    this.emit();
  }

  /** Replace the entire state (e.g. uploading local data to a fresh cloud account). */
  async replaceAll(state: AppState): Promise<void> {
    this.commit(state);
  }

  private commit(next: AppState): void {
    // One-way unlock: any change that completes a prerequisite book opens its
    // dependents (e.g. Basic 100 fully mastered unlocks the Supplemental List).
    // The in-memory state updates optimistically; persistence is async.
    const state = { ...next, books: applyLocks(next.books, false) };
    this.state = state;
    this.emit();
    // Durably buffer the change for signed-in users BEFORE the (async, possibly
    // failing) cloud write, so a refresh never loses it. Cleared once the cloud
    // write is confirmed via onSyncSettled.
    this.writePending(state);
    void this.repo.save(state);
  }

  /** Record a finished test in history (best-effort; ignored by no-op backends). */
  recordSession(session: TestSessionRecord): void {
    void this.repo.recordSession?.(session);
    // Keep a local copy too when the active backend is the cloud, so a failed
    // cloud write never silently loses the record. (Signed out, the active repo
    // already IS local storage — writing again would double-count.)
    if (!(this.repo instanceof LocalStorageRepository)) {
      void this.localHistory.recordSession(session);
    }
  }

  /** Load completed sessions from the active backend (for the statistics page). */
  async loadSessions(): Promise<StoredSession[]> {
    try {
      const primary = (await this.repo.loadSessions?.()) ?? [];
      // Cloud returned nothing (empty or failed) → fall back to the local
      // mirror so a misconfigured backend doesn't show an empty stats page.
      if (primary.length || this.repo instanceof LocalStorageRepository) {
        return primary;
      }
      return (await this.localHistory.loadSessions()) ?? [];
    } catch {
      try {
        return (await this.localHistory.loadSessions()) ?? [];
      } catch {
        return [];
      }
    }
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  private updateBook(bookId: string, updater: (book: Book) => Book): void {
    const books = this.state.books.map((b) =>
      b.id === bookId ? updater(b) : b
    );
    this.commit({ ...this.state, books });
  }

  // --- Book actions --------------------------------------------------------

  addBook(name: string): Book {
    const book: Book = {
      id: createId(),
      name: name.trim() || "New Book",
      words: [],
      currentTest: 1,
      locked: false,
      unlockAfterBookId: null,
      builtIn: false,
      createdAt: 0,
    };
    this.commit({ ...this.state, books: [...this.state.books, book] });
    return book;
  }

  renameBook(bookId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.updateBook(bookId, (b) => ({ ...b, name: trimmed }));
  }

  deleteBook(bookId: string): void {
    const books = this.state.books.filter((b) => b.id !== bookId);
    this.commit({ ...this.state, books });
  }

  // --- Word actions --------------------------------------------------------

  addWord(bookId: string, word: string, meaning: string): void {
    if (!word.trim() || !meaning.trim()) return;
    this.updateBook(bookId, (b) => ({
      ...b,
      words: [...b.words, createWord(nextNumber(b.words), word, meaning)],
    }));
  }

  updateWord(
    bookId: string,
    wordId: string,
    patch: { word: string; meaning: string }
  ): void {
    this.updateBook(bookId, (b) => ({
      ...b,
      words: b.words.map((w) =>
        w.id === wordId
          ? { ...w, word: patch.word.trim(), meaning: patch.meaning.trim() }
          : w
      ),
    }));
  }

  deleteWord(bookId: string, wordId: string): void {
    this.updateBook(bookId, (b) => ({
      ...b,
      words: b.words.filter((w) => w.id !== wordId),
    }));
  }

  /**
   * Import many entries at once. Duplicate English words (case-insensitive)
   * are either skipped or have their meaning replaced, per `strategy`.
   */
  bulkImport(
    bookId: string,
    entries: ParsedEntry[],
    strategy: ImportStrategy
  ): ImportSummary {
    const summary: ImportSummary = { imported: 0, replaced: 0, skipped: 0 };

    this.updateBook(bookId, (book) => {
      const words = [...book.words];
      const indexByKey = new Map<string, number>();
      words.forEach((w, i) => indexByKey.set(w.word.toLowerCase(), i));
      let auto = nextNumber(words);

      for (const entry of entries) {
        const key = entry.word.trim().toLowerCase();
        const existingIndex = indexByKey.get(key);

        if (existingIndex === undefined) {
          // Use the explicit number if provided, else the next auto number.
          const num = entry.number ?? auto;
          auto = Math.max(auto, num) + 1;
          words.push(createWord(num, entry.word, entry.meaning));
          indexByKey.set(key, words.length - 1);
          summary.imported++;
        } else if (strategy === "replace") {
          // Keep the existing number to preserve sheet alignment.
          words[existingIndex] = {
            ...words[existingIndex],
            meaning: entry.meaning.trim(),
          };
          summary.replaced++;
        } else {
          summary.skipped++;
        }
      }

      return { ...book, words };
    });

    return summary;
  }

  // --- Test actions --------------------------------------------------------

  /**
   * Grade a single answer, applying the SRS transition against the book's
   * current test number. Persisted immediately so progress survives a refresh
   * mid-test.
   */
  gradeWord(bookId: string, wordId: string, result: Grade): void {
    this.updateBook(bookId, (b) => ({
      ...b,
      words: b.words.map((w) =>
        w.id === wordId ? gradeWord(w, b.currentTest, result) : w
      ),
    }));
  }

  /** Advance the book's test counter. Call once when a test finishes. */
  completeTest(bookId: string): void {
    this.updateBook(bookId, (b) => ({ ...b, currentTest: b.currentTest + 1 }));
  }

  /**
   * Record that the learner completed a test today, updating the daily streak.
   *
   * Idempotent by design: {@link applyStudyDay} is a no-op when today is already
   * the recorded study day, so multiple completed tests, wrong-answer retries,
   * and result-screen refreshes on the same calendar date never double-count.
   * Returns the resulting streak so the caller can show the up-to-date value.
   */
  registerStudyDay(): StreakState {
    const streak = applyStudyDay(this.state.streak, new Date());
    if (streak !== this.state.streak) {
      this.commit({ ...this.state, streak });
    }
    return streak;
  }

  // --- Progress & data actions --------------------------------------------

  /**
   * Reset SRS progress for one book (words back to level 0, test counter to 1)
   * without deleting words. Also re-evaluates dependent-book locks.
   */
  resetBookProgress(bookId: string): void {
    const books = this.state.books.map((b) =>
      b.id === bookId ? resetProgress(b) : b
    );
    this.commit({ ...this.state, books: applyLocks(books, true) });
  }

  /**
   * Reset learning progress across every book without deleting any words.
   * Clears current test, master status, level, and consecutive-correct counts.
   */
  resetAllProgress(): void {
    const books = this.state.books.map(resetProgress);
    this.commit({ ...this.state, books: applyLocks(books, true) });
  }

  updateSettings(patch: Partial<AppSettings>): void {
    this.commit({
      ...this.state,
      settings: { ...this.state.settings, ...patch },
    });
  }

  /** Wipe everything and reseed the two starter books. */
  clearAll(): void {
    const seed = createInitialState();
    this.state = seed;
    this.emit();
    void (async () => {
      try {
        await this.repo.clear();
        await this.repo.save(seed);
        // Also wipe the local history mirror (no-op if it's the active repo).
        if (!(this.repo instanceof LocalStorageRepository)) {
          await this.localHistory.clear();
        }
      } catch (err) {
        console.error("Failed to clear data", err);
      }
    })();
  }

  // --- Backup / restore ----------------------------------------------------

  /** Serialize the full app state to a pretty-printed JSON string. */
  serialize(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Replace all data from a backup JSON string. Returns false (leaving current
   * data untouched) if the input is not a recognizable backup.
   */
  importBackup(json: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return false;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { books?: unknown }).books)
    ) {
      return false;
    }
    this.commit(migrateState(parsed));
    return true;
  }
}

/** Module singleton wired to LocalStorage. Swap the repo to change backends. */
export const store = new VocabStore(new LocalStorageRepository());
