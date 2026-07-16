import type { AppSettings, AppState, Book } from "@/types";
import type { ParsedEntry } from "@/services/vocabIO";
import type { StateRepository } from "@/storage/repository";
import { LocalStorageRepository } from "@/storage/localStorageRepository";
import { createInitialState } from "@/storage/seed";
import { createId } from "@/services/id";
import { createWord } from "@/services/srs";

export type ImportStrategy = "skip" | "replace";

export interface ImportSummary {
  imported: number;
  replaced: number;
  skipped: number;
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
  private readonly repo: StateRepository;
  private state: AppState;
  private listeners = new Set<Listener>();
  private hydrated = false;

  constructor(repo: StateRepository) {
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

  /** Load persisted state on the client. Safe to call multiple times. */
  hydrate = (): void => {
    if (this.hydrated) return;
    const loaded = this.repo.load();
    if (loaded) {
      this.state = loaded;
    } else {
      // First run — persist the seeded state.
      this.repo.save(this.state);
    }
    this.hydrated = true;
    this.emit();
  };

  private commit(next: AppState): void {
    this.state = next;
    this.repo.save(next);
    this.emit();
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
      words: [...b.words, createWord(word, meaning)],
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

      for (const entry of entries) {
        const key = entry.word.trim().toLowerCase();
        const existingIndex = indexByKey.get(key);

        if (existingIndex === undefined) {
          words.push(createWord(entry.word, entry.meaning));
          indexByKey.set(key, words.length - 1);
          summary.imported++;
        } else if (strategy === "replace") {
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

  // --- Progress & data actions --------------------------------------------

  /** Reset SRS progress for one book (words back to level 0, test counter to 1). */
  resetBookProgress(bookId: string): void {
    this.updateBook(bookId, (b) => ({
      ...b,
      currentTest: 1,
      words: b.words.map((w) => ({
        ...w,
        mastered: false,
        consecutiveCorrect: 0,
        level: 0,
        nextReviewTest: 0,
      })),
    }));
  }

  updateSettings(patch: Partial<AppSettings>): void {
    this.commit({
      ...this.state,
      settings: { ...this.state.settings, ...patch },
    });
  }

  /** Wipe everything and reseed the two starter books. */
  clearAll(): void {
    this.repo.clear();
    this.state = createInitialState();
    this.repo.save(this.state);
    this.emit();
  }
}

/** Module singleton wired to LocalStorage. Swap the repo to change backends. */
export const store = new VocabStore(new LocalStorageRepository());
