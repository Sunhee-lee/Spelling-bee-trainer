import type { Book, Word } from "@/types";

/**
 * Lesson system for the built-in "Basic 100" book.
 *
 * The book is delivered as staged lessons of 20 words each, computed purely
 * from word order — there is no lesson table and no duplicated word data. A
 * lesson is `Math.floor((position - 1) / 20) + 1`, where position is the 1-based
 * index of the word in the book's number-sorted list.
 *
 * Lessons apply ONLY to Basic 100. User-created Supplemental lists keep the
 * plain Learn + Test flow.
 */

export const LESSON_SIZE = 20;

export type LessonStatus =
  | "notStarted"
  | "learning"
  | "readyForTest"
  | "completed";

/** Minimal per-lesson progress. Stored per book+lesson, nothing duplicated. */
export interface LessonProgress {
  learnStartedAt?: number;
  learnCompletedAt?: number;
  testCompletedAt?: number;
}

export interface Lesson {
  /** 0-based lesson index. */
  index: number;
  /** 1-based lesson number, for display ("Lesson {number}"). */
  number: number;
  /** The lesson's words, sorted by number. */
  words: Word[];
  /** First / last printed word number in the lesson (for "Words 1–20"). */
  startNumber: number;
  endNumber: number;
}

export interface LessonView extends Lesson {
  status: LessonStatus;
  /** True until the previous lesson is completed (first lesson is never locked). */
  locked: boolean;
  /**
   * How many of the lesson's words are SRS-mastered. This is INDEPENDENT of
   * lesson completion: a lesson can be Completed with few mastered words, and a
   * word can be mastered without the lesson being Completed.
   */
  masteredCount: number;
  /** True when every word in the lesson is mastered ("Lesson Mastered"). */
  allMastered: boolean;
}

/**
 * A lesson book is the built-in top-level book (Basic 100): built-in and not
 * gated behind another book. The Supplemental List is built-in but has an
 * `unlockAfterBookId`, and user books aren't built-in — so this uniquely
 * identifies Basic 100 without a dedicated flag or a fragile name match.
 */
export function isLessonBook(book: Book): boolean {
  return book.builtIn && book.unlockAfterBookId === null;
}

/** Split a book's words into ordered lessons of {@link LESSON_SIZE}. */
export function computeLessons(book: Book): Lesson[] {
  const sorted = [...book.words].sort((a, b) => a.number - b.number);
  const lessons: Lesson[] = [];
  for (let i = 0; i < sorted.length; i += LESSON_SIZE) {
    const chunk = sorted.slice(i, i + LESSON_SIZE);
    lessons.push({
      index: lessons.length,
      number: lessons.length + 1,
      words: chunk,
      startNumber: chunk[0].number,
      endNumber: chunk[chunk.length - 1].number,
    });
  }
  return lessons;
}

/** Derive a lesson's status from its stored progress. */
export function lessonStatus(progress: LessonProgress | undefined): LessonStatus {
  if (!progress) return "notStarted";
  if (progress.learnCompletedAt && progress.testCompletedAt) return "completed";
  if (progress.learnCompletedAt) return "readyForTest";
  if (progress.learnStartedAt) return "learning";
  return "notStarted";
}

/**
 * Combine lessons with their stored progress into a display-ready view: the
 * status per lesson and the unlock gate (lesson N opens once N-1 is completed;
 * the first lesson is always open).
 */
export function computeLessonViews(
  book: Book,
  progressByIndex: Record<number, LessonProgress>
): LessonView[] {
  const lessons = computeLessons(book);
  const views: LessonView[] = [];
  for (const lesson of lessons) {
    const status = lessonStatus(progressByIndex[lesson.index]);
    const locked =
      lesson.index > 0 && views[lesson.index - 1]?.status !== "completed";
    const masteredCount = lesson.words.filter((w) => w.mastered).length;
    const allMastered = lesson.words.length > 0 && masteredCount === lesson.words.length;
    views.push({ ...lesson, status, locked, masteredCount, allMastered });
  }
  return views;
}

/** True once every lesson in the book is completed (and there is at least one). */
export function allLessonsCompleted(views: LessonView[]): boolean {
  return views.length > 0 && views.every((v) => v.status === "completed");
}
