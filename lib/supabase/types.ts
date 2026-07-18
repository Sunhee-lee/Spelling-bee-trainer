/**
 * Row shapes for the Supabase tables. These mirror the SQL in
 * `supabase/migrations`. Column names are snake_case (DB convention) and are
 * mapped to/from the camelCase domain types in the SupabaseRepository.
 */

export interface BookRow {
  id: string;
  user_id: string;
  name: string;
  current_test: number;
  is_locked: boolean;
  unlock_after_book_id: string | null;
  built_in: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WordRow {
  id: string;
  book_id: string;
  user_id: string;
  number: number;
  word: string;
  meaning: string;
  mastered: boolean;
  consecutive_correct: number;
  level: number;
  next_review_test: number;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsRow {
  id?: string;
  user_id: string;
  questions_per_test: number;
  master_review_rate: number;
  shuffle_questions: boolean;
  language: string;
  /** Daily learning streak (Phase 3). */
  current_streak: number;
  longest_streak: number;
  /** Local calendar date "YYYY-MM-DD", or null. */
  last_study_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TestSessionRow {
  id: string;
  user_id: string;
  book_id: string;
  score: number;
  correct: number;
  wrong: number;
  created_at?: string;
}

export interface TestAnswerRow {
  id?: string;
  session_id: string;
  word_id: string;
  correct: boolean;
  created_at?: string;
}

export interface LessonProgressRow {
  id?: string;
  user_id: string;
  book_id: string;
  lesson_number: number;
  /** ISO timestamp, or null if not yet completed. */
  learn_completed_at: string | null;
  test_completed_at: string | null;
  updated_at?: string;
}
