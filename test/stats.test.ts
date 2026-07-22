import { describe, expect, it } from "vitest";

import type { Book, Word } from "@/types";
import { bookGuide, TODAY_PRACTICE_SIZE } from "@/services/stats";

function word(n: number, mastered: boolean): Word {
  return {
    id: `w${n}`,
    number: n,
    word: `word${n}`,
    meaning: `뜻${n}`,
    mastered,
    consecutiveCorrect: mastered ? 4 : 0,
    level: 0,
    nextReviewTest: 0,
  };
}

function book(masteredCount: number, total: number): Book {
  const words = Array.from({ length: total }, (_, i) =>
    word(i + 1, i < masteredCount)
  );
  return {
    id: "b1",
    name: "Book",
    words,
    currentTest: 1,
    locked: false,
    unlockAfterBookId: null,
    builtIn: false,
    createdAt: 0,
  };
}

describe("bookGuide", () => {
  it("reports empty for a book with no words", () => {
    expect(bookGuide(book(0, 0))).toEqual({ kind: "empty" });
  });

  it("celebrates when every word is mastered", () => {
    expect(bookGuide(book(10, 10))).toEqual({ kind: "allMastered" });
  });

  it("nudges the final stretch when few words remain", () => {
    // 2 of 10 remaining (<= threshold) → almost.
    expect(bookGuide(book(8, 10))).toEqual({ kind: "almost", count: 2 });
  });

  it("suggests a practice batch mid-way, capped at the practice size", () => {
    // 50 remaining → capped at TODAY_PRACTICE_SIZE.
    expect(bookGuide(book(50, 100))).toEqual({
      kind: "practice",
      count: TODAY_PRACTICE_SIZE,
    });
  });

  it("uses the exact remaining count when below the practice cap", () => {
    // 12 remaining, above the almost threshold, below the cap.
    expect(bookGuide(book(88, 100))).toEqual({ kind: "practice", count: 12 });
  });
});
