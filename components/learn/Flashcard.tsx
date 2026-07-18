"use client";

import { Star } from "lucide-react";

import type { Word } from "@/types";
import { MASTER_THRESHOLD } from "@/services/srs";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FlashcardProps {
  word: Word;
  flipped: boolean;
  /** 0-based position, used for the screen-reader card label. */
  index: number;
  total: number;
  onFlip: () => void;
  /** Whether to show the "tap to reveal" hint (hidden after the first flip). */
  showHint: boolean;
}

/**
 * The word's SRS mastery, shown top-right for context while reviewing. This is
 * DISPLAY ONLY — read straight from the existing `mastered` / `consecutiveCorrect`
 * fields. Viewing a card never changes any SRS data.
 */
function MasteryBadge({ word }: { word: Word }) {
  const { t } = useTranslation();
  if (word.mastered) {
    return (
      <span
        className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-bee/25 px-2.5 py-1 text-xs font-bold text-amber-700"
        aria-label={t("learn.masteredBadge")}
      >
        <Star className="size-3.5 fill-current" aria-hidden /> {t("learn.masteredBadge")}
      </span>
    );
  }
  const count = Math.min(Math.max(word.consecutiveCorrect, 0), MASTER_THRESHOLD);
  return (
    <span
      className="pointer-events-none inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground"
      aria-label={t("learn.masteryProgressLabel", { count, total: MASTER_THRESHOLD })}
    >
      {count} / {MASTER_THRESHOLD}
    </span>
  );
}

/**
 * A single study card. The front shows the English word; the back shows the
 * Korean meaning (plus the word, small). Both faces are stacked in one grid
 * cell and cross-faded by opacity — no 3D flip and no layout shift, so the card
 * never resizes as it turns. A compact mastery badge sits top-right, in the same
 * place on both faces. It's a `role="button"` div (not a native button) so the
 * Learn page's global Space/Enter handler is the single source of the keyboard
 * flip and never double-fires.
 */
export function Flashcard({
  word,
  flipped,
  index,
  total,
  onFlip,
  showHint,
}: FlashcardProps) {
  const { t } = useTranslation();
  const hasMeaning = word.meaning.trim().length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={t("learn.cardPosition", { current: index + 1, total })}
      onClick={onFlip}
      className={cn(
        "relative grid min-h-[19rem] w-full cursor-pointer select-none place-items-center",
        "rounded-3xl border-2 border-border bg-card px-6 py-10 text-center shadow-sm",
        "outline-none focus-visible:ring-4 focus-visible:ring-ring/40 sm:min-h-[22rem]"
      )}
    >
      {/* Mastery badge — same position on both faces, above the flipping content. */}
      <div className="absolute right-3 top-3 z-10">
        <MasteryBadge word={word} />
      </div>

      {/* Front — English word */}
      <div
        aria-hidden={flipped}
        className={cn(
          "sbt-card-face col-start-1 row-start-1 flex flex-col items-center gap-4",
          flipped ? "opacity-0" : "opacity-100"
        )}
      >
        <p className="break-words text-4xl font-extrabold leading-tight sm:text-5xl">
          {word.word}
        </p>
        {showHint && (
          <span className="text-xs font-medium text-muted-foreground">
            {t("learn.tapToReveal")}
          </span>
        )}
      </div>

      {/* Back — Korean meaning */}
      <div
        aria-hidden={!flipped}
        className={cn(
          "sbt-card-face col-start-1 row-start-1 flex flex-col items-center gap-3",
          flipped ? "opacity-100" : "opacity-0"
        )}
      >
        {hasMeaning ? (
          <p className="break-words text-4xl font-extrabold leading-tight text-primary sm:text-5xl">
            {word.meaning}
          </p>
        ) : (
          <p className="text-lg font-semibold text-muted-foreground">
            {t("learn.noMeaning")}
          </p>
        )}
        <span className="text-lg font-semibold text-muted-foreground">
          {word.word}
        </span>
      </div>
    </div>
  );
}
