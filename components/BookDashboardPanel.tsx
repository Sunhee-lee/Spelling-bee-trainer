"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  Layers,
  Play,
  Plus,
} from "lucide-react";

import type { Book } from "@/types";
import { bookGuide, computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { HiveBeeIcon } from "@/components/HiveBeeIcon";
import { BookProgressCard } from "@/components/BookProgressCard";
import { BookQuickLinks } from "@/components/BookQuickLinks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BookDashboardPanelProps {
  book: Book;
  /** Current daily learning streak; a small chip shows only when >= 2. */
  currentStreak?: number;
}

/**
 * The learning panel for an unlocked general book. Shares the common book
 * shell (progress card + quick links) with Basic 100; the middle is a single
 * "Today's Practice" flow. Each button names a distinct action — Today's
 * Practice (test), Learn with Flashcards (study), Full Test — so none overlap.
 * Empty books show a friendly "add words" state instead of 0 / 0.
 */
export function BookDashboardPanel({
  book,
  currentStreak = 0,
}: BookDashboardPanelProps) {
  const { t } = useTranslation();
  const stats = computeBookStats(book);

  // Empty book → never show 0 / 0. Encourage adding words instead.
  if (stats.total === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <HiveBeeIcon className="size-28" />
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

  const guide = bookGuide(book);
  const goalText =
    guide.kind === "allMastered"
      ? t("book.guideAllMastered")
      : guide.kind === "almost"
        ? t("book.guideAlmost", { count: guide.count })
        : guide.kind === "practice"
          ? t("book.guidePractice", { count: guide.count })
          : "";

  return (
    <div className="flex flex-col gap-4">
      <BookProgressCard
        book={book}
        currentStreak={currentStreak}
        goalText={goalText}
      />

      {/* Primary action — the one big button. */}
      <Button asChild size="xl" className="w-full py-5">
        <Link href={`/books/${book.id}/test?mode=today`}>
          <Play className="fill-current" /> {t("book.todayPractice")}
        </Link>
      </Button>

      {/* Study the cards (distinct from testing). */}
      <Button asChild size="lg" variant="outline" className="w-full">
        <Link href={`/learn/${book.id}`}>
          <Layers /> {t("book.flashcardLearn")}
        </Link>
      </Button>

      {/* Test every word. */}
      <Button asChild size="lg" variant="outline" className="w-full">
        <Link href={`/books/${book.id}/test?mode=full`}>
          <ClipboardCheck /> {t("book.fullTest")}
        </Link>
      </Button>

      <BookQuickLinks bookId={book.id} />
    </div>
  );
}
