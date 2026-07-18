import { describe, expect, it } from "vitest";

import { mergeLessonMaps, mergeLessonProgress } from "@/lib/lessonSync";

describe("mergeLessonProgress", () => {
  it("unions completions, keeping the earliest timestamp", () => {
    const a = { learnStartedAt: 5, learnCompletedAt: 10 };
    const b = { learnCompletedAt: 8, testCompletedAt: 20 };
    expect(mergeLessonProgress(a, b)).toEqual({
      learnStartedAt: 5,
      learnCompletedAt: 8, // earliest of 10 / 8
      testCompletedAt: 20,
    });
  });

  it("handles one side missing", () => {
    expect(mergeLessonProgress({ testCompletedAt: 3 }, undefined)).toEqual({
      testCompletedAt: 3,
    });
    expect(mergeLessonProgress(undefined, { learnCompletedAt: 7 })).toEqual({
      learnCompletedAt: 7,
    });
    expect(mergeLessonProgress(undefined, undefined)).toEqual({});
  });

  it("is commutative", () => {
    const a = { learnCompletedAt: 10, testCompletedAt: 30 };
    const b = { learnCompletedAt: 5 };
    expect(mergeLessonProgress(a, b)).toEqual(mergeLessonProgress(b, a));
  });
});

describe("mergeLessonMaps", () => {
  it("merges across books and lessons (local + cloud)", () => {
    const local = {
      b1: { 0: { learnCompletedAt: 10, testCompletedAt: 20 }, 1: { learnStartedAt: 3 } },
    };
    const cloud = {
      b1: { 0: { learnCompletedAt: 8, testCompletedAt: 25 } },
      b2: { 0: { learnCompletedAt: 100, testCompletedAt: 200 } },
    };
    const merged = mergeLessonMaps(local, cloud);
    expect(merged.b1[0]).toEqual({ learnCompletedAt: 8, testCompletedAt: 20 });
    expect(merged.b1[1]).toEqual({ learnStartedAt: 3 }); // local-only "learning"
    expect(merged.b2[0]).toEqual({ learnCompletedAt: 100, testCompletedAt: 200 });
  });

  it("is idempotent when re-merged with itself", () => {
    const m = { b1: { 0: { learnCompletedAt: 1, testCompletedAt: 2 } } };
    expect(mergeLessonMaps(m, m)).toEqual(m);
  });

  it("empty maps merge to empty", () => {
    expect(mergeLessonMaps({}, {})).toEqual({});
  });
});
