"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Play,
  Plus,
  Trophy,
} from "lucide-react";

import type { Book } from "@/types";
import { computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { SproutIcon } from "@/components/SproutIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BookDashboardPanelProps {
  book: Book;
  /** Current daily learning streak; a small chip shows only when >= 2. */
  currentStreak?: number;
}

/**
 * The learning panel for an unlocked book. Focused on learning, not
 * management: a Learning Progress section, one prominent Today's Practice
 * action, a secondary Full Test, a Master Words card, and a small Manage
 * Words link. Empty books show a friendly "add words" state instead of 0 / 0.
 */
export function BookDashboardPanel({
  book,
  currentStreak = 0,
}: BookDashboardPanelProps) {
  const { t } = useTranslation();
  const stats = computeBookStats(book);
  const isEmpty = stats.total === 0;
  const remaining = stats.total - stats.mastered;
  const isComplete = stats.total > 0 && remaining === 0;

  // Empty book → never show 0 / 0. Encourage adding words instead.
  if (isEmpty) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="text-sm font-semibold text-muted-foreground">
            {t("book.learningProgress")}
          </span>
          <SproutIcon className="size-14" />
          <p className="font-semibold">{t("book.noVocabAdded")}</p>
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {t("book.noVocabHint")}
          </p>
          <Button asChild size="lg" className="mt-1 w-full sm:w-auto">
            <Link href={`/books/${book.id}/words`}>
              <Plus /> {t("book.addWords")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Learning progress */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("book.learningProgress")}
            </span>
            {currentStreak >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bee/20 px-2.5 py-1 text-xs font-bold">
                <Flame className="size-3.5 text-amber-500" />
                {t("streak.dayStreak", { count: currentStreak })}
              </span>
            )}
          </div>
          <Progress value={stats.progress} indicatorClassName="bg-bee" />
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold tabular-nums">
              {stats.mastered}{" "}
              <span className="text-lg font-bold text-muted-foreground">
                / {stats.total}
              </span>
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {isComplete
                ? t("book.fullyMastered", { book: book.name })
                : t(remaining === 1 ? "book.remainingOne" : "book.remainingShort", {
                    count: remaining,
                  })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Primary CTA — always the most prominent action */}
      <Button asChild size="xl" className="w-full py-5">
        <Link href={`/books/${book.id}/test?mode=today`}>
          <Play className="fill-current" /> {t("book.todayPractice")}
        </Link>
      </Button>

      {/* Secondary CTA */}
      <Button asChild size="lg" variant="outline" className="w-full">
        <Link href={`/books/${book.id}/test?mode=full`}>
          <ClipboardCheck /> {t("book.fullTest")}
        </Link>
      </Button>

      {/* Master Words card */}
      <Link
        href={`/books/${book.id}/master`}
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="transition-colors hover:bg-muted/40">
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold">
                <Trophy className="size-5 text-bee" /> {t("master.title")}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </div>
            {stats.mastered > 0 ? (
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
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">{t("master.noMasterYet")}</p>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {t("master.noMasterDesc")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Statistics — small secondary link, below the learning actions */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="self-center text-muted-foreground"
      >
        <Link href={`/statistics?book=${book.id}`}>
          <BarChart3 /> {t("stats.link")}
        </Link>
      </Button>

      {/* Manage words — small secondary link, kept apart from learning */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="self-center text-muted-foreground"
      >
        <Link href={`/books/${book.id}/words`}>
          <BookOpen /> {t("book.manageWords")}
        </Link>
      </Button>
    </div>
  );
}
