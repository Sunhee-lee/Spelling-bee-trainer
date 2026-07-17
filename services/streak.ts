import type { StreakState } from "@/types";

/** Safe defaults for a learner who has never completed a test. */
export const EMPTY_STREAK: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
};

/**
 * Local calendar date as "YYYY-MM-DD". Uses the device's local time (not UTC)
 * so a study day flips at the learner's midnight, per spec.
 */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Fold one completed study day into the streak, given "now".
 *
 * Rules (Phase 3):
 *   - Already studied today → unchanged (idempotent; multiple tests / retries /
 *     refreshes on the same date never double-count).
 *   - Studied yesterday      → continue the run (+1).
 *   - Any longer gap, or first ever → start a new run at 1.
 *   - `longestStreak` only ever grows.
 */
export function applyStudyDay(prev: StreakState, now: Date): StreakState {
  const today = dateKey(now);
  if (prev.lastStudyDate === today) return prev;

  // Local yesterday — the Date constructor normalizes month/year rollover.
  const yesterday = dateKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  );
  const currentStreak = prev.lastStudyDate === yesterday ? prev.currentStreak + 1 : 1;

  return {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastStudyDate: today,
  };
}
