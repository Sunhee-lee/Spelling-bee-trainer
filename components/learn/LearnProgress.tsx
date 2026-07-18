"use client";

import { useTranslation } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";

interface LearnProgressProps {
  /** 1-based position of the current card. */
  current: number;
  total: number;
}

/** Slim "3 / 20" counter and bar shown above the flashcard. */
export function LearnProgress({ current, total }: LearnProgressProps) {
  const { t } = useTranslation();
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-sm font-semibold tabular-nums text-muted-foreground"
        aria-live="polite"
      >
        {t("learn.progress", { current, total })}
      </span>
      <Progress value={percent} indicatorClassName="bg-bee" />
    </div>
  );
}
