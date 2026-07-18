/**
 * Pure navigation logic for a Learn session. Kept free of React and storage so
 * it can be unit-tested directly. The hook (`useLearnSession`) wraps this and
 * adds persistence.
 */

export type LearnPhase = "card" | "complete";

export interface LearnState {
  /** Current card index (0-based). Meaningful only while phase === "card". */
  index: number;
  /** Whether the current card shows its back (the meaning). */
  flipped: boolean;
  /** "card" while studying; "complete" once the learner passes the last card. */
  phase: LearnPhase;
}

export type LearnAction =
  | { type: "flip" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "reviewAgain" }
  | { type: "goTo"; index: number };

export function initLearnState(startIndex: number): LearnState {
  return { index: Math.max(0, startIndex), flipped: false, phase: "card" };
}

/**
 * Advance the session. `total` is the number of cards. Always starts a new card
 * on its front (never carries a flip across cards) and moving past the last
 * card transitions to the "complete" phase (§4).
 */
export function learnReducer(
  state: LearnState,
  action: LearnAction,
  total: number
): LearnState {
  switch (action.type) {
    case "flip":
      if (state.phase !== "card") return state;
      return { ...state, flipped: !state.flipped };

    case "next": {
      if (state.phase !== "card") return state;
      if (state.index >= total - 1) {
        return { ...state, phase: "complete", flipped: false };
      }
      return { index: state.index + 1, flipped: false, phase: "card" };
    }

    case "prev": {
      if (state.phase !== "card") return state;
      if (state.index <= 0) return { ...state, flipped: false };
      return { index: state.index - 1, flipped: false, phase: "card" };
    }

    case "reviewAgain":
      return { index: 0, flipped: false, phase: "card" };

    case "goTo": {
      const clamped = Math.max(0, Math.min(action.index, Math.max(0, total - 1)));
      return { index: clamped, flipped: false, phase: "card" };
    }

    default:
      return state;
  }
}
