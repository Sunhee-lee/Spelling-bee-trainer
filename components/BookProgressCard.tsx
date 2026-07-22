"use client";

import { Flame, Star } from "lucide-react";

import type { Book } from "@/types";
import { computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BookProgressCardProps {
  book: Book;
  /** Current daily learning streak; a small chip shows only when >= 2. */
  currentStreak?: number;
  /** Optional lesson meter (Basic 100 only). */
  lesson?: { completed: number; total: number };
  /** The "next goal" line — what to do next. */
  goalText: string;
}

/**
 * The progress card shared by every book screen. Mastery is the headline
 * achievement (⭐ big count + bar); Basic 100 adds a secondary lesson meter.
 * A single "next goal" line always tells the learner what to do next.
 */
export function BookProgressCard({
  book,
  currentStreak = 0,
  lesson,
  goalText,
}: BookProgressCardProps) {
  const { t } = useTranslation();
  const stats = computeBookStats(book);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {/* Mastery — the headline achievement. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Star className="size-4 text-bee" aria-hidden />
              {t("book.masteryProgress")}
            </span>
            {currentStreak >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bee/20 px-2.5 py-1 text-xs font-bold">
                <Flame className="size-3.5 text-amber-500" />
                {t("streak.dayStreak", { count: currentStreak })}
              </span>
            )}
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold tabular-nums">
              {stats.mastered}{" "}
              <span className="text-lg font-bold text-muted-foreground">
                / {stats.total}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {stats.progress}%
            </span>
          </div>
          <Progress value={stats.progress} indicatorClassName="bg-bee" />
        </div>

        {/* Lesson meter — secondary, Basic 100 only. */}
        {lesson && lesson.total > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-muted-foreground">
                {t("lesson.lessonProgressLabel")}
              </span>
              <span className="tabular-nums">
                {t("lesson.progressLessons", {
                  completed: lesson.completed,
                  total: lesson.total,
                })}
              </span>
            </div>
            <Progress
              value={(lesson.completed / lesson.total) * 100}
              indicatorClassName="bg-grass"
            />
          </div>
        )}

        {/* Next goal — always answers "what now?". */}
        <div className="flex flex-col gap-0.5 border-t border-border pt-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("book.nextGoalLabel")}
          </span>
          <span className="text-sm font-semibold">{goalText}</span>
        </div>
      </CardContent>
    </Card>
  );
}
