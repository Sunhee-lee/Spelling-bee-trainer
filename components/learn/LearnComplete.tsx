"use client";

import Link from "next/link";
import { LayoutDashboard, Lock, Play, RotateCcw } from "lucide-react";

import type { Book } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { Celebration } from "@/components/Celebration";
import { HiveBeeIcon } from "@/components/HiveBeeIcon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LearnCompleteProps {
  book: Book;
  total: number;
  onReviewAgain: () => void;
}

/**
 * Shown after the last card. Learning is decoupled from testing, so this only
 * celebrates finishing the review — it changes no mastery, streak, or history.
 * "Start Spelling Test" is the natural next step, but it's disabled with a lock
 * hint when the book's practice is still locked (Learn stays available, tests
 * don't).
 */
export function LearnComplete({ book, total, onReviewAgain }: LearnCompleteProps) {
  const { t } = useTranslation();
  const locked = book.locked;

  return (
    <div className="relative flex flex-col gap-6">
      <Celebration intensity="calm" />

      <Card className="sbt-pop-in items-center gap-3 py-10 text-center">
        <HiveBeeIcon className="size-24" />
        <h1 className="text-2xl font-extrabold">{t("learn.complete")}</h1>
        <p className="text-sm font-semibold text-muted-foreground">
          {t("learn.completeDesc", { count: total })}
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        {locked ? (
          <div className="flex flex-col items-center gap-1.5">
            <Button size="xl" className="w-full" disabled>
              <Lock /> {t("learn.startSpellingTest")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("test.lockedDesc")}</p>
          </div>
        ) : (
          <Button asChild size="xl" className="w-full">
            <Link href={`/books/${book.id}/test?mode=today`}>
              <Play className="fill-current" /> {t("learn.startSpellingTest")}
            </Link>
          </Button>
        )}

        <Button size="lg" variant="outline" className="w-full" onClick={onReviewAgain}>
          <RotateCcw /> {t("learn.reviewAgain")}
        </Button>

        <Button asChild size="lg" variant="ghost" className="w-full">
          <Link href={`/books/${book.id}`}>
            <LayoutDashboard /> {t("common.backToBook")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
