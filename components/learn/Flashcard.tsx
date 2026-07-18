"use client";

import type { Word } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PronunciationButton } from "@/components/learn/PronunciationButton";

interface FlashcardProps {
  word: Word;
  flipped: boolean;
  /** 0-based position, used for the screen-reader card label. */
  index: number;
  total: number;
  onFlip: () => void;
}

/**
 * A single study card. The front shows the English word; the back shows the
 * Korean meaning (plus the word, small). Both faces are stacked in one grid
 * cell and cross-faded by opacity — no 3D flip and no layout shift, so the card
 * never resizes as it turns. It's a `role="button"` div (not a native button)
 * so the Learn page's global Space/Enter handler is the single source of the
 * keyboard flip and never double-fires.
 */
export function Flashcard({ word, flipped, index, total, onFlip }: FlashcardProps) {
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
        "grid min-h-[19rem] w-full cursor-pointer select-none place-items-center",
        "rounded-3xl border-2 border-border bg-card px-6 py-10 text-center shadow-sm",
        "outline-none focus-visible:ring-4 focus-visible:ring-ring/40 sm:min-h-[22rem]"
      )}
    >
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
        <PronunciationButton text={word.word} />
        <span className="text-xs font-medium text-muted-foreground">
          {t("learn.tapToReveal")}
        </span>
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
