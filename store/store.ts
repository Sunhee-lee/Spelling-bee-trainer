import type { AppSettings, AppState, Book, StreakState, Word } from "@/types";
import type { ParsedEntry } from "@/services/vocabIO";
import type {
  StorageRepository,
  TestSessionRecord,
} from "@/storage/repository";
import { LocalStorageRepository } from "@/storage/localStorageRepository";
import { createInitialState } from "@/storage/seed";
import { migrateState } from "@/storage/migrate";
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

  constructor(repo: StorageRepository) {
    this.repo = repo;
    // Deterministic pre-hydration snapshot for SSR + first client paint.
    this.state = createInitialState();
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
    void this.repo.save(state);
  }

  /** Record a finished test in history (best-effort; ignored by no-op backends). */
  recordSession(session: TestSessionRecord): void {
    void this.repo.recordSession?.(session);
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
