"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import type { Word } from "@/types";
import {
  initLearnState,
  learnReducer,
  type LearnAction,
  type LearnPhase,
  type LearnState,
} from "@/lib/learnSession";
import { readLearnProgress, resolveStartIndex, writeLearnProgress } from "@/lib/learnProgress";

export interface LearnSession {
  index: number;
  flipped: boolean;
  phase: LearnPhase;
  total: number;
  current: Word | null;
  isFirst: boolean;
  isLast: boolean;
  flip: () => void;
  next: () => void;
  prev: () => void;
  reviewAgain: () => void;
}

/**
 * Drives a Learn session over a book's words: resolves the resume position on
 * entry, exposes flip/prev/next/reviewAgain, and quietly persists lightweight
 * progress to its own (unsynced) LocalStorage key. It reads only from the words
 * passed in and writes only to `learnProgress` — it never touches the store,
 * SRS mastery, the streak, or test history.
 */
export function useLearnSession(
  bookId: string,
  words: Word[],
  ready: boolean
): LearnSession {
  const total = words.length;

  // Keep the reducer stable while letting it see the current card count.
  const totalRef = useRef(total);
  totalRef.current = total;
  const reducer = useCallback(
    (state: LearnState, action: LearnAction) =>
      learnReducer(state, action, totalRef.current),
    []
  );
  const [state, dispatch] = useReducer(reducer, 0, initLearnState);

  // Resolve the resume position exactly once, after words are available.
  const startedRef = useRef(false);
  useEffect(() => {
    if (!ready || total === 0 || startedRef.current) return;
    startedRef.current = true;
    const start = resolveStartIndex(words, readLearnProgress(bookId));
    if (start > 0) dispatch({ type: "goTo", index: start });
  }, [ready, total, words, bookId]);

  // Persist progress whenever the position or phase changes. Preserve any
  // existing completedAt, and stamp it the first time the end is reached.
  useEffect(() => {
    if (!ready || total === 0 || !startedRef.current) return;
    const prev = readLearnProgress(bookId);
    const current = words[state.index];
    writeLearnProgress(bookId, {
      lastLearnedIndex: state.index,
      lastLearnedWordId: current?.id ?? null,
      lastLearnedAt: Date.now(),
      completedAt:
        state.phase === "complete"
          ? prev?.completedAt ?? Date.now()
          : prev?.completedAt ?? null,
    });
  }, [state.index, state.phase, ready, total, bookId, words]);

  const flip = useCallback(() => dispatch({ type: "flip" }), []);
  const next = useCallback(() => dispatch({ type: "next" }), []);
  const prev = useCallback(() => dispatch({ type: "prev" }), []);
  const reviewAgain = useCallback(() => dispatch({ type: "reviewAgain" }), []);

  const current = state.phase === "card" ? words[state.index] ?? null : null;

  return {
    index: state.index,
    flipped: state.flipped,
    phase: state.phase,
    total,
    current,
    isFirst: state.index <= 0,
    isLast: state.index >= total - 1,
    flip,
    next,
    prev,
    reviewAgain,
  };
}
