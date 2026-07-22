import { beforeEach, describe, expect, it } from "vitest";

import type { Word } from "@/types";
import {
  initLearnState,
  learnReducer,
  selectLearnWords,
  type LearnState,
} from "@/lib/learnSession";
import {
  clearLearnProgress,
  readLearnProgress,
  resolveStartIndex,
  writeLearnProgress,
  type BookLearnProgress,
} from "@/lib/learnProgress";

const w = (id: string) => ({ id });

describe("learnReducer", () => {
  const total = 3;
  const start = (over: Partial<LearnState> = {}): LearnState => ({
    index: 0,
    flipped: false,
    phase: "card",
    ...over,
  });

  it("flip toggles the current face", () => {
    expect(learnReducer(start(), { type: "flip" }, total).flipped).toBe(true);
    expect(
      learnReducer(start({ flipped: true }), { type: "flip" }, total).flipped
    ).toBe(false);
  });

  it("next advances and always resets to the front", () => {
    const s = learnReducer(start({ flipped: true }), { type: "next" }, total);
    expect(s.index).toBe(1);
    expect(s.flipped).toBe(false);
    expect(s.phase).toBe("card");
  });

  it("next past the last card completes the session", () => {
    const s = learnReducer(start({ index: total - 1 }), { type: "next" }, total);
    expect(s.phase).toBe("complete");
  });

  it("prev goes back but never before the first card", () => {
    expect(learnReducer(start({ index: 2 }), { type: "prev" }, total).index).toBe(1);
    expect(learnReducer(start({ index: 0 }), { type: "prev" }, total).index).toBe(0);
  });

  it("reviewAgain restarts at the first card", () => {
    const s = learnReducer(
      start({ index: 2, phase: "complete" }),
      { type: "reviewAgain" },
      total
    );
    expect(s).toEqual({ index: 0, flipped: false, phase: "card" });
  });

  it("goTo clamps to the valid range", () => {
    expect(learnReducer(start(), { type: "goTo", index: 99 }, total).index).toBe(2);
    expect(learnReducer(start(), { type: "goTo", index: -5 }, total).index).toBe(0);
  });

  it("ignores navigation while complete", () => {
    const done = start({ index: 2, phase: "complete" });
    expect(learnReducer(done, { type: "next" }, total)).toBe(done);
    expect(learnReducer(done, { type: "prev" }, total)).toBe(done);
    expect(learnReducer(done, { type: "flip" }, total)).toBe(done);
  });

  it("initLearnState starts on the front at the given index", () => {
    expect(initLearnState(2)).toEqual({ index: 2, flipped: false, phase: "card" });
    expect(initLearnState(-1).index).toBe(0);
  });
});

describe("selectLearnWords", () => {
  const word = (n: number, mastered: boolean): Word => ({
    id: `w${n}`,
    number: n,
    word: `word${n}`,
    meaning: `뜻${n}`,
    mastered,
    consecutiveCorrect: mastered ? 4 : 0,
    level: 0,
    nextReviewTest: 0,
  });

  it("keeps only not-yet-mastered words", () => {
    const words = [word(1, true), word(2, false), word(3, true), word(4, false)];
    expect(selectLearnWords(words).map((w) => w.number)).toEqual([2, 4]);
  });

  it("falls back to the full set when every word is mastered", () => {
    const words = [word(1, true), word(2, true)];
    expect(selectLearnWords(words).map((w) => w.number)).toEqual([1, 2]);
  });

  it("returns an empty list for an empty book", () => {
    expect(selectLearnWords([])).toEqual([]);
  });
});

describe("resolveStartIndex", () => {
  const words = [w("a"), w("b"), w("c")];

  it("returns 0 with no saved progress", () => {
    expect(resolveStartIndex(words, null)).toBe(0);
  });

  it("resumes by word id first (order-stable)", () => {
    const progress: BookLearnProgress = {
      lastLearnedIndex: 0,
      lastLearnedWordId: "c",
      lastLearnedAt: 1,
      completedAt: null,
    };
    // Even though the saved index says 0, the id wins → index 2.
    expect(resolveStartIndex(words, progress)).toBe(2);
  });

  it("falls back to the saved index when the id is gone", () => {
    const progress: BookLearnProgress = {
      lastLearnedIndex: 1,
      lastLearnedWordId: "deleted",
      lastLearnedAt: 1,
      completedAt: null,
    };
    expect(resolveStartIndex(words, progress)).toBe(1);
  });

  it("clamps a stale index to the current list", () => {
    const progress: BookLearnProgress = {
      lastLearnedIndex: 10,
      lastLearnedWordId: null,
      lastLearnedAt: 1,
      completedAt: null,
    };
    expect(resolveStartIndex(words, progress)).toBe(2);
  });

  it("returns 0 for an empty word list", () => {
    expect(resolveStartIndex([], null)).toBe(0);
  });

  it("starts a COMPLETED session from card 1 (review, not resume)", () => {
    const progress: BookLearnProgress = {
      lastLearnedIndex: 2,
      lastLearnedWordId: "c",
      lastLearnedAt: 1,
      completedAt: 999, // finished once → "Learn Again" reviews from the top
    };
    expect(resolveStartIndex(words, progress)).toBe(0);
  });
});

describe("learnProgress storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips per-book progress", () => {
    const p: BookLearnProgress = {
      lastLearnedIndex: 4,
      lastLearnedWordId: "x",
      lastLearnedAt: 123,
      completedAt: null,
    };
    writeLearnProgress("book-1", p);
    expect(readLearnProgress("book-1")).toEqual(p);
    expect(readLearnProgress("book-2")).toBeNull();
  });

  it("keeps books independent and clears one at a time", () => {
    const base: BookLearnProgress = {
      lastLearnedIndex: 0,
      lastLearnedWordId: "a",
      lastLearnedAt: 1,
      completedAt: null,
    };
    writeLearnProgress("b1", base);
    writeLearnProgress("b2", { ...base, lastLearnedWordId: "z" });
    clearLearnProgress("b1");
    expect(readLearnProgress("b1")).toBeNull();
    expect(readLearnProgress("b2")?.lastLearnedWordId).toBe("z");
  });
});
