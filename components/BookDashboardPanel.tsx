"use client";

import Link from "next/link";
import { BookOpen, ClipboardCheck, Play, Trophy } from "lucide-react";

import type { Book } from "@/types";
import { computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BookDashboardPanelProps {
  book: Book;
  /** Questions per test, shown as the Today's Practice subtitle. */
  questionsPerTest: number;
}

/**
 * The learning panel for a book: one progress section (mastered / total +
 * words remaining), today's review & learning counts, a single primary
 * Today's Practice action, a secondary Full Test, and smaller Master Words /
 * Manage Words links. Kept focused on learning.
 */
export function BookDashboardPanel({
  book,
  questionsPerTest,
}: BookDashboardPanelProps) {
  const { t } = useTranslation();
  const stats = computeBookStats(book);
  const isEmpty = stats.total === 0;
  const canTest = !book.locked && !isEmpty;
  const remaining = stats.total - stats.mastered;
  const isComplete = stats.total > 0 && remaining === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Single progress section */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("progress.mastered")}
            </span>
            <span className="text-2xl font-extrabold tabular-nums">
              {stats.mastered}{" "}
              <span className="text-base font-bold text-muted-foreground">
                / {stats.total}
              </span>
            </span>
          </div>
          <Progress value={stats.progress} indicatorClassName="bg-bee" />
          <p className="text-sm font-semibold text-muted-foreground">
            {isComplete
              ? t("book.fullyMastered", { book: book.name })
              : t("book.remainingShort", { count: remaining })}
          </p>
        </CardContent>
      </Card>

      {/* Today's practice breakdown */}
      {!isEmpty && (
        <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3 text-sm font-semibold">
          <span>{t("book.todayPractice")}</span>
          <span className="flex gap-3 text-muted-foreground">
            <span>{t("book.reviewCount", { count: stats.review })}</span>
            <span>{t("book.learningCount", { count: stats.learning })}</span>
          </span>
        </div>
      )}

      {/* Primary CTA */}
      <Button
        asChild={canTest}
        size="xl"
        className="w-full flex-col gap-0.5 py-5"
        disabled={!canTest}
      >
        {canTest ? (
          <Link href={`/books/${book.id}/test?mode=today`}>
            <span className="flex items-center gap-2">
              <Play className="fill-current" /> {t("book.todayPractice")}
            </span>
            <span className="text-xs font-medium opacity-80">
              {t("book.todayPracticeSubtitle", { count: questionsPerTest })}
            </span>
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            <Play className="fill-current" /> {t("book.todayPractice")}
          </span>
        )}
      </Button>

      {/* Secondary CTA */}
      <Button
        asChild={canTest}
        size="lg"
        variant="outline"
        className="w-full"
        disabled={!canTest}
      >
        {canTest ? (
          <Link href={`/books/${book.id}/test?mode=full`}>
            <ClipboardCheck /> {t("book.fullTest")}
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            <ClipboardCheck /> {t("book.fullTest")}
          </span>
        )}
      </Button>

      {/* Lower-priority links */}
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <Button asChild variant="ghost" size="sm" className="flex-1">
          <Link href={`/books/${book.id}/master`}>
            <Trophy /> {t("book.masterWordsShort")} · {stats.mastered} /{" "}
            {stats.total}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="flex-1">
          <Link href={`/books/${book.id}/words`}>
            <BookOpen /> {t("book.manageWords")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
