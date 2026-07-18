import { describe, expect, it } from "vitest";

import type { AppSettings, Book, Word } from "@/types";
import { buildFullTestWords, buildLessonTestWords } from "@/services/testSession";

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
