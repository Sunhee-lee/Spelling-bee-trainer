import { describe, expect, it } from "vitest";

import type { AppSettings, Book, Word } from "@/types";
import {
  buildFullTestWords,
  buildLessonTestWords,
  buildTestWords,
} from "@/services/testSession";

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
const settings = (shuffleQuestions: boolean): AppSettings => ({
  questionsPerTest: 20,
  masterReviewRate: 0.1,
  shuffleQuestions,
  language: "ko",
});
const book = (words: Word[]): Book => ({
  id: "b1",
  name: "Basic 100",
  words,
  currentTest: 1,
  locked: false,
  unlockAfterBookId: null,
  builtIn: true,
  createdAt: 0,
});

// Numbers out of order in the source, to prove sorting isn't incidental.
const words = [word(3), word(1), word(2), word(5), word(4)];

describe("buildFullTestWords honours the shuffle setting", () => {
  it("shuffle OFF → strictly by number", () => {
    expect(buildFullTestWords(book(words), settings(false)).map((w) => w.number)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("shuffle ON → same set of words (order may differ)", () => {
    const out = buildFullTestWords(book(words), settings(true));
    expect(out.map((w) => w.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("buildLessonTestWords honours the shuffle setting", () => {
  const lesson = [word(23), word(21), word(22)];
  it("shuffle OFF → strictly by number", () => {
    expect(buildLessonTestWords(lesson, settings(false)).map((w) => w.number)).toEqual([
      21, 22, 23,
    ]);
  });

  it("shuffle ON → same lesson words, no other words leak in", () => {
    const out = buildLessonTestWords(lesson, settings(true));
    expect(out.map((w) => w.number).sort((a, b) => a - b)).toEqual([21, 22, 23]);
  });
});

describe("buildTestWords (Today's Practice) — SRS-gated mastery", () => {
  const w = (n: number, over: Partial<Word> = {}): Word => ({ ...word(n), ...over });
  // book() fixes currentTest = 1, so nextReviewTest <= 1 means "due".
  const nums = (ws: Word[]) => ws.map((x) => x.number);

  it("excludes mastered words that are not due for review", () => {
    const b = book([
      w(1), // not mastered, due
      w(2, { mastered: true, nextReviewTest: 5 }), // mastered, not due → excluded
    ]);
    expect(nums(buildTestWords(b, settings(false)))).toEqual([1]);
  });

  it("resurfaces mastered words once their spaced-review is due", () => {
    const b = book([
      w(1), // learning, due
      w(2, { mastered: true, nextReviewTest: 1 }), // mastered, due → spaced review
      w(3, { mastered: true, nextReviewTest: 9 }), // mastered, not due → excluded
    ]);
    // Learning first, then due mastered review; #3 stays out.
    expect(nums(buildTestWords(b, settings(false)))).toEqual([1, 2]);
  });

  it("puts not-yet-mastered learning ahead of mastered spaced reviews", () => {
    const b = book([
      w(5, { mastered: true, nextReviewTest: 0 }), // mastered, due
      w(1), // learning, due
    ]);
    expect(nums(buildTestWords(b, settings(false)))).toEqual([1, 5]);
  });

  it("still yields a maintenance review when everything is mastered and nothing is due", () => {
    const b = book([
      w(1, { mastered: true, nextReviewTest: 10 }),
      w(2, { mastered: true, nextReviewTest: 20 }),
    ]);
    expect(nums(buildTestWords(b, settings(false)))).toEqual([1, 2]);
  });

  it("caps the test at questionsPerTest", () => {
    const b = book([w(1), w(2), w(3), w(4), w(5)]);
    const capped: AppSettings = { ...settings(false), questionsPerTest: 2 };
    expect(buildTestWords(b, capped)).toHaveLength(2);
  });
});
