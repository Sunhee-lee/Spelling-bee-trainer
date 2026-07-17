"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Play,
  Plus,
  Trophy,
} from "lucide-react";

import type { Book } from "@/types";
import { computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BookDashboardPanelProps {
  book: Book;
}

/**
 * The learning panel for an unlocked book. Focused on learning, not
 * management: a Learning Progress section, one prominent Today's Practice
 * action, a secondary Full Test, a Master Words card, and a small Manage
 * Words link. Empty books show a friendly "add words" state instead of 0 / 0.
 */
export function BookDashboardPanel({ book }: BookDashboardPanelProps) {
  const { t } = useTranslation();
  const stats = computeBookStats(book);
  const isEmpty = stats.total === 0;
  const remaining = stats.total - stats.mastered;
  const isComplete = stats.total > 0 && remaining === 0;

  // Empty book → never show 0 / 0. Encourage adding words instead.
  if (isEmpty) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="text-sm font-semibold text-muted-foreground">
            {t("book.learningProgress")}
          </span>
          <div className="text-5xl" aria-hidden>
            🌱
          </div>
          <p className="font-semibold">{t("book.noVocabAdded")}</p>
          <Button asChild size="lg" className="w-full sm:w-auto">
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
          <span className="text-sm font-semibold text-muted-foreground">
            {t("book.learningProgress")}
          </span>
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
                : t("book.remainingShort", { count: remaining })}
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
