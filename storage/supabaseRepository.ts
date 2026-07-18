import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppSettings, AppState, Book, StreakState, Word } from "@/types";
import type {
  StorageRepository,
  StoredSession,
  TestSessionRecord,
} from "@/storage/repository";
import { DEFAULT_SETTINGS, STATE_VERSION } from "@/storage/seed";
import { EMPTY_STREAK } from "@/services/streak";
import type {
  BookRow,
  SettingsRow,
  WordRow,
} from "@/lib/supabase/types";

const FLUSH_DELAY_MS = 600;

/**
 * Supabase-backed implementation of {@link StorageRepository}. Used when a user
 * is signed in. The whole {@link AppState} is assembled from the normalized
 * tables on load and written back on save (a debounced full upsert plus
 * diff-deletes for removed rows). RLS ensures every row is scoped to the user.
 */
export class SupabaseRepository implements StorageRepository {
  private pending: AppState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Notified after every flush with the sync error, or `null` on success. The
   * store uses this to clear its durable local buffer only once the cloud write
   * is confirmed, and to surface failures to the user.
   */
  onSyncSettled: ((error: unknown) => void) | null = null;

  constructor(
    private readonly supabase: SupabaseClient,
    readonly userId: string
  ) {}

  // --- load ----------------------------------------------------------------

  async load(): Promise<AppState | null> {
    const [booksRes, wordsRes, settingsRes] = await Promise.all([
      this.supabase
        .from("vocabulary_books")
        .select("*")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: true }),
      this.supabase.from("words").select("*").eq("user_id", this.userId),
      this.supabase
        .from("settings")
        .select("*")
        .eq("user_id", this.userId)
        .maybeSingle(),
    ]);

    if (booksRes.error) throw booksRes.error;
    if (wordsRes.error) throw wordsRes.error;

    const bookRows = (booksRes.data ?? []) as BookRow[];
    // No books yet → treat as empty so the store seeds the starter books.
    if (bookRows.length === 0) return null;

    const wordRows = (wordsRes.data ?? []) as WordRow[];
    const wordsByBook = new Map<string, Word[]>();
    for (const r of wordRows) {
      const list = wordsByBook.get(r.book_id) ?? [];
      list.push({
        id: r.id,
        number: r.number,
        word: r.word,
        meaning: r.meaning,
        mastered: r.mastered,
        consecutiveCorrect: r.consecutive_correct,
        level: r.level,
        nextReviewTest: r.next_review_test,
      });
      wordsByBook.set(r.book_id, list);
    }

    const books: Book[] = bookRows.map((r) => ({
      id: r.id,
      name: r.name,
      words: wordsByBook.get(r.id) ?? [],
      currentTest: r.current_test,
      locked: r.is_locked,
      unlockAfterBookId: r.unlock_after_book_id,
      builtIn: r.built_in,
      createdAt: 0,
    }));

    const settingsRow = (settingsRes.data as SettingsRow | null) ?? null;
    const settings: AppSettings = settingsRow
      ? {
          questionsPerTest: settingsRow.questions_per_test,
          masterReviewRate: settingsRow.master_review_rate,
          shuffleQuestions: settingsRow.shuffle_questions,
          language:
            settingsRow.language === "en" || settingsRow.language === "ko"
              ? settingsRow.language
              : DEFAULT_SETTINGS.language,
        }
      : { ...DEFAULT_SETTINGS };

    // Streak columns may be absent on rows created before migration 0004 —
    // fall back to safe defaults so older accounts keep their progress.
    const streak: StreakState = settingsRow
      ? {
          currentStreak: settingsRow.current_streak ?? 0,
          longestStreak: settingsRow.longest_streak ?? 0,
          lastStudyDate: settingsRow.last_study_date ?? null,
        }
      : { ...EMPTY_STREAK };

    return { version: STATE_VERSION, books, settings, streak };
  }

  // --- save (debounced) ----------------------------------------------------

  async save(state: AppState): Promise<void> {
    this.pending = state;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flushNow();
    }, FLUSH_DELAY_MS);
  }

  /**
   * Flush any pending write immediately (used before recording history, and by
   * the manual "upload this device's data" action). Resolves to `true` when the
   * cloud write succeeded (or there was nothing pending), `false` on error.
   */
  async flushNow(): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const state = this.pending;
    if (!state) return true;
    this.pending = null;

    try {
      await this.sync(state);
      this.onSyncSettled?.(null);
      return true;
    } catch (err) {
      // Surface for debugging AND tell the store so it keeps the unsynced data
      // in its durable buffer and can notify the user.
      console.error("Supabase sync failed", err);
      this.onSyncSettled?.(err);
      return false;
    }
  }

  private async sync(state: AppState): Promise<void> {
    // Settings (one row per user). Non-critical for vocabulary data: if the
    // settings row fails (e.g. a column from a later migration is missing), we
    // log it but must NOT abort — otherwise a settings problem would silently
    // block every book/word write. (Supabase returns errors in `.error`; it
    // does not throw, so each result must be checked explicitly.)
    const settingsRes = await this.supabase.from("settings").upsert(
      {
        user_id: this.userId,
        questions_per_test: state.settings.questionsPerTest,
        master_review_rate: state.settings.masterReviewRate,
        shuffle_questions: state.settings.shuffleQuestions,
        language: state.settings.language,
        current_streak: state.streak.currentStreak,
        longest_streak: state.streak.longestStreak,
        last_study_date: state.streak.lastStudyDate,
      },
      { onConflict: "user_id" }
    );
    if (settingsRes.error) {
      console.error("Supabase settings sync failed (continuing)", settingsRes.error);
    }

    // Books, then words (words FK-reference books, so order matters). Any
    // failure here MUST throw so the change stays in the store's durable buffer
    // and the user is told — never a silent loss.
    const bookRows = state.books.map((b) => ({
      id: b.id,
      user_id: this.userId,
      name: b.name,
      current_test: b.currentTest,
      is_locked: b.locked,
      unlock_after_book_id: b.unlockAfterBookId,
      built_in: b.builtIn,
    }));
    if (bookRows.length) {
      const { error } = await this.supabase.from("vocabulary_books").upsert(bookRows);
      if (error) throw error;
    }

    const wordRows = state.books.flatMap((b) =>
      b.words.map((w) => ({
        id: w.id,
        book_id: b.id,
        user_id: this.userId,
        number: w.number,
        word: w.word,
        meaning: w.meaning,
        mastered: w.mastered,
        consecutive_correct: w.consecutiveCorrect,
        level: w.level,
        next_review_test: w.nextReviewTest,
      }))
    );
    if (wordRows.length) {
      const { error } = await this.supabase.from("words").upsert(wordRows);
      if (error) throw error;
    }

    // Diff-delete removed words then books (book delete cascades its words).
    const keepBookIds = new Set(state.books.map((b) => b.id));
    const keepWordIds = new Set(wordRows.map((r) => r.id));

    const existingWords = await this.supabase
      .from("words")
      .select("id")
      .eq("user_id", this.userId);
    if (existingWords.error) throw existingWords.error;
    const wordsToDelete = ((existingWords.data ?? []) as { id: string }[])
      .map((r) => r.id)
      .filter((id) => !keepWordIds.has(id));
    if (wordsToDelete.length) {
      const { error } = await this.supabase.from("words").delete().in("id", wordsToDelete);
      if (error) throw error;
    }

    const existingBooks = await this.supabase
      .from("vocabulary_books")
      .select("id")
      .eq("user_id", this.userId);
    if (existingBooks.error) throw existingBooks.error;
    const booksToDelete = ((existingBooks.data ?? []) as { id: string }[])
      .map((r) => r.id)
      .filter((id) => !keepBookIds.has(id));
    if (booksToDelete.length) {
      const { error } = await this.supabase
        .from("vocabulary_books")
        .delete()
        .in("id", booksToDelete);
      if (error) throw error;
    }
  }

  // --- clear ---------------------------------------------------------------

  async clear(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = null;
    // Books cascade to words; sessions cascade to answers.
    await this.supabase.from("vocabulary_books").delete().eq("user_id", this.userId);
    await this.supabase.from("test_sessions").delete().eq("user_id", this.userId);
  }

  // --- test history --------------------------------------------------------

  async loadSessions(): Promise<StoredSession[]> {
    const { data, error } = await this.supabase
      .from("test_sessions")
      .select("book_id, correct, wrong, created_at")
      .eq("user_id", this.userId);
    if (error) {
      // Surface the real cause (missing table, RLS, etc.) instead of an empty
      // statistics page with no explanation.
      console.error("Supabase loadSessions failed", error);
    }
    if (error || !data) return [];
    return (data as { book_id: string; correct: number; wrong: number; created_at: string }[]).map(
      (r) => ({
        bookId: r.book_id,
        correct: r.correct,
        wrong: r.wrong,
        createdAt: r.created_at,
      })
    );
  }

  async recordSession(session: TestSessionRecord): Promise<void> {
    // Make sure the words referenced by answers already exist in the cloud.
    await this.flushNow();
    try {
      const { data, error } = await this.supabase
        .from("test_sessions")
        .insert({
          user_id: this.userId,
          book_id: session.bookId,
          score: session.score,
          correct: session.correct,
          wrong: session.wrong,
        })
        .select("id")
        .single();
      if (error || !data) {
        // Surface the real cause (missing table, RLS, FK, etc.) so a failed
        // cloud write doesn't silently leave the statistics page empty.
        console.error("Supabase recordSession: test_sessions insert failed", error);
        return;
      }

      const sessionId = (data as { id: string }).id;
      if (session.answers.length) {
        const { error: answersError } = await this.supabase
          .from("test_answers")
          .insert(
            session.answers.map((a) => ({
              session_id: sessionId,
              word_id: a.wordId,
              correct: a.correct,
            }))
          );
        if (answersError) {
          console.error(
            "Supabase recordSession: test_answers insert failed",
            answersError
          );
        }
      }
    } catch (err) {
      console.error("Supabase recordSession failed", err);
    }
  }
}
