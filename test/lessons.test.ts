import { beforeEach, describe, expect, it } from "vitest";

import type { Book, Word } from "@/types";
import {
  allLessonsCompleted,
  computeLessons,
  computeLessonViews,
  isLessonBook,
  lessonStatus,
  type LessonProgress,
} from "@/services/lessons";
import {
  markLessonLearnCompleted,
  markLessonLearnStarted,
  markLessonTestCompleted,
  readBookLessons,
  resetBookLessons,
} from "@/lib/lessonProgress";

function word(n: number): Word {
  return {
    id: `w${n}`,
    number: n,
    word: `word${n}`,
    meaning: `뜻${n}`,
    mastered: false,
    consecutiveCorrect: 0,
    level: 0,
    nextReviewTest: 0,
  };
}
function book(over: Partial<Book> = {}): Book {
  return {
    id: "b1",
    name: "Basic 100",
    words: [],
    currentTest: 1,
    locked: false,
    unlockAfterBookId: null,
    builtIn: true,
    createdAt: 0,
    ...over,
  };
}

describe("isLessonBook", () => {
  it("is true only for the built-in top-level book", () => {
    expect(isLessonBook(book())).toBe(true);
    expect(isLessonBook(book({ unlockAfterBookId: "b0" }))).toBe(false); // Supplemental
    expect(isLessonBook(book({ builtIn: false }))).toBe(false); // user book
  });
});

describe("computeLessons", () => {
  it("splits into ordered chunks of 20", () => {
    const words = Array.from({ length: 45 }, (_, i) => word(i + 1));
    const lessons = computeLessons(book({ words }));
    expect(lessons.map((l) => l.words.length)).toEqual([20, 20, 5]);
    expect(lessons[0]).toMatchObject({ index: 0, number: 1, startNumber: 1, endNumber: 20 });
    expect(lessons[1]).toMatchObject({ index: 1, number: 2, startNumber: 21, endNumber: 40 });
    expect(lessons[2]).toMatchObject({ number: 3, startNumber: 41, endNumber: 45 });
  });

  it("groups by position, tolerating gaps in numbers", () => {
    const words = [word(1), word(2), word(50), word(51)];
    const lessons = computeLessons(book({ words }));
    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({ startNumber: 1, endNumber: 51 });
  });

  it("returns no lessons for an empty book", () => {
    expect(computeLessons(book())).toEqual([]);
  });
});

describe("lessonStatus", () => {
  it("derives status from the three timestamps", () => {
    expect(lessonStatus(undefined)).toBe("notStarted");
    expect(lessonStatus({ learnStartedAt: 1 })).toBe("learning");
    expect(lessonStatus({ learnStartedAt: 1, learnCompletedAt: 2 })).toBe("readyForTest");
    expect(
      lessonStatus({ learnStartedAt: 1, learnCompletedAt: 2, testCompletedAt: 3 })
    ).toBe("completed");
  });

  it("requires learn completion for completed, not just a test", () => {
    // A test flag without learn completion is still just "notStarted"/learning.
    expect(lessonStatus({ testCompletedAt: 3 } as LessonProgress)).toBe("notStarted");
  });
});

describe("computeLessonViews (locking)", () => {
  const words = Array.from({ length: 60 }, (_, i) => word(i + 1)); // 3 lessons
  const done: LessonProgress = { learnStartedAt: 1, learnCompletedAt: 2, testCompletedAt: 3 };

  it("unlocks only the first lesson initially", () => {
    const views = computeLessonViews(book({ words }), {});
    expect(views.map((v) => v.locked)).toEqual([false, true, true]);
  });

  it("unlocks the next lesson once the previous is completed", () => {
    const views = computeLessonViews(book({ words }), { 0: done });
    expect(views.map((v) => v.locked)).toEqual([false, false, true]);
    expect(views[0].status).toBe("completed");
  });

  it("does NOT unlock the next on learn-only (ready for test, not completed)", () => {
    const views = computeLessonViews(book({ words }), {
      0: { learnStartedAt: 1, learnCompletedAt: 2 },
    });
    expect(views[0].status).toBe("readyForTest");
    expect(views[1].locked).toBe(true);
  });

  it("allLessonsCompleted only when every lesson is done", () => {
    expect(allLessonsCompleted(computeLessonViews(book({ words }), { 0: done, 1: done }))).toBe(false);
    expect(
      allLessonsCompleted(computeLessonViews(book({ words }), { 0: done, 1: done, 2: done }))
    ).toBe(true);
    expect(allLessonsCompleted(computeLessonViews(book(), {}))).toBe(false); // empty
  });
});

describe("lessonProgress storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("records the learn/test lifecycle → completed", () => {
    markLessonLearnStarted("b1", 0);
    expect(lessonStatus(readBookLessons("b1")[0])).toBe("learning");
    markLessonLearnCompleted("b1", 0);
    expect(lessonStatus(readBookLessons("b1")[0])).toBe("readyForTest");
    markLessonTestCompleted("b1", 0);
    expect(lessonStatus(readBookLessons("b1")[0])).toBe("completed");
  });

  it("keeps the first learnStartedAt timestamp", () => {
    markLessonLearnStarted("b1", 0);
    const first = readBookLessons("b1")[0].learnStartedAt;
    markLessonLearnStarted("b1", 0);
    expect(readBookLessons("b1")[0].learnStartedAt).toBe(first);
  });

  it("isolates books and resets one at a time", () => {
    markLessonTestCompleted("b1", 0);
    markLessonTestCompleted("b2", 0);
    resetBookLessons("b1");
    expect(readBookLessons("b1")).toEqual({});
    expect(readBookLessons("b2")[0].testCompletedAt).toBeTruthy();
  });
});

describe("lesson replay policy (§22)", () => {
  beforeEach(() => window.localStorage.clear());

  it("replaying a completed lesson keeps it Completed with unchanged timestamps", () => {
    markLessonLearnStarted("b1", 0);
    markLessonLearnCompleted("b1", 0);
    markLessonTestCompleted("b1", 0);
    const before = { ...readBookLessons("b1")[0] };
    expect(lessonStatus(before)).toBe("completed");

    // Re-learn and re-test the same lesson (a review).
    markLessonLearnStarted("b1", 0);
    markLessonLearnCompleted("b1", 0);
    markLessonTestCompleted("b1", 0);

    const after = readBookLessons("b1")[0];
    expect(lessonStatus(after)).toBe("completed");
    // Timestamps are preserved (Completed means "completed at least once").
    expect(after).toEqual(before);
  });

  it("replaying a completed lesson does not re-lock the next lesson", () => {
    const words = Array.from({ length: 60 }, (_, i) => word(i + 1)); // 3 lessons
    markLessonLearnStarted("b1", 0);
    markLessonLearnCompleted("b1", 0);
    markLessonTestCompleted("b1", 0);

    // Replay lesson 0, then check lesson 1 stays unlocked.
    markLessonLearnCompleted("b1", 0);
    markLessonTestCompleted("b1", 0);
    const views = computeLessonViews(book({ words }), readBookLessons("b1"));
    expect(views[0].status).toBe("completed");
    expect(views[1].locked).toBe(false);
  });
});
