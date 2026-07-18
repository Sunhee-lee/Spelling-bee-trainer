"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface LearnControlsProps {
  onPrev: () => void;
  onFlip: () => void;
  onNext: () => void;
  isFirst: boolean;
  /** When true, "next" ends the session (shown for the last card). */
  isLast: boolean;
}

/**
 * Bottom control row: previous / flip / next. Previous is disabled on the first
 * card; next always advances (past the last card it opens the complete screen).
 * Prev/next are square icon buttons; the wide middle button flips the card and
 * mirrors the tap gesture for discoverability and keyboard/AT users.
 */
export function LearnControls({
  onPrev,
  onFlip,
  onNext,
  isFirst,
  isLast,
}: LearnControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <Button
        variant="outline"
        size="lg"
        className="size-14 px-0"
        onClick={onPrev}
        disabled={isFirst}
        aria-label={t("learn.previous")}
      >
        <ChevronLeft className="size-6" />
      </Button>

      <Button variant="secondary" size="lg" onClick={onFlip}>
        <RefreshCw /> {t("learn.flip")}
      </Button>

      <Button
        size="lg"
        className="size-14 px-0"
        onClick={onNext}
        aria-label={isLast ? t("learn.complete") : t("learn.next")}
      >
        <ChevronRight className="size-6" />
      </Button>
    </div>
  );
}
