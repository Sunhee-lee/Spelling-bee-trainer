"use client";

import Link from "next/link";
import { useBookId } from "@/lib/useBookId";
import { ClipboardCheck, Layers, Lock, Play, Search, Star } from "lucide-react";

import type { Book } from "@/types";
import { useAppState } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { isLessonBook } from "@/services/lessons";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BookDashboardPanel } from "@/components/BookDashboardPanel";
import { BookQuickLinks } from "@/components/BookQuickLinks";
import { LessonListPanel } from "@/components/LessonListPanel";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Screen for a book whose *practice* is locked (e.g. the Supplemental List).
 * Practice / tests are disabled until the prerequisite is mastered, but words
 * can still be managed in advance, so this screen offers Manage Words and shows
 * the two learning actions as disabled — it is "practice locked", not "no
 * access".
 */
function LockedBookScreen({ book, prerequisite }: { book: Book; prerequisite?: Book }) {
  const { t } = useTranslation();
  const preStats = prerequisite ? computeBookStats(prerequisite) : undefined;
  const preName = prerequisite?.name ?? "Basic 100";
  const remaining = preStats ? preStats.total - preStats.mastered : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title={book.name} backHref="/" />

      {/* Lock notice — communicates the practice-locked state. */}
      <Card className="items-center gap-3 py-8 text-center">
        <Lock className="size-12 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-extrabold">{book.name}</h1>
        <Badge variant="muted" className="gap-1">
          <Lock className="size-3.5" /> {t("book.practiceLocked")}
        </Badge>
        <p className="max-w-sm px-4 text-sm text-muted-foreground">
          {t("book.lockedUnlockMsg", { prereq: preName })}
        </p>
      </Card>

      {/* Unlock progress — same card shape as the unlocked BookProgressCard,
          but tracking the prerequisite book's mastery (what actually unlocks). */}
      {preStats && preStats.total > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Star className="size-4 text-bee" aria-hidden />
                {t("book.lockedProgressLabel")}
              </span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-extrabold tabular-nums">
                  {preStats.mastered}{" "}
                  <span className="text-lg font-bold text-muted-foreground">
                    / {preStats.total}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {preStats.progress}%
                </span>
              </div>
              <Progress value={preStats.progress} indicatorClassName="bg-bee" />
            </div>
            <div className="flex flex-col gap-0.5 border-t border-border pt-3">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("book.nextGoalLabel")}
              </span>
              <span className="text-sm font-semibold">
                {t("book.lockedRemaining", { count: remaining })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Same action order/names as the unlocked shell; tests disabled. */}
      <Button size="xl" className="w-full py-5" disabled>
        <Play className="fill-current" /> {t("book.todayPractice")}
      </Button>

      {/* Flashcard learning stays available (only testing is locked). */}
      {book.words.length > 0 && (
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href={`/learn/${book.id}`}>
            <Layers /> {t("book.flashcardLearn")}
          </Link>
        </Button>
      )}

      <Button size="lg" variant="outline" className="w-full" disabled>
        <ClipboardCheck /> {t("book.fullTest")}
      </Button>

      <BookQuickLinks bookId={book.id} />

      <p className="text-center text-sm text-muted-foreground">
        {t("book.lockedAuto", { prereq: preName })}
      </p>
    </main>
  );
}

export default function BookDashboardPage() {
  const bookId = useBookId();
  const { state, hydrated } = useAppState();
  const { t } = useTranslation();
  const book = state.books.find((b) => b.id === bookId);

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Card className="h-72 animate-pulse bg-muted/60" />
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <EmptyState
          icon={<Search />}
          title={t("common.bookNotFound")}
          description={t("common.bookNotFoundDesc")}
        >
          <Button asChild>
            <Link href="/">{t("common.backToBooks")}</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  const prerequisite = book.unlockAfterBookId
    ? state.books.find((b) => b.id === book.unlockAfterBookId)
    : undefined;

  // Locked dependent book → show only the unlock/progress screen.
  if (book.locked) {
    return <LockedBookScreen book={book} prerequisite={prerequisite} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={book.name}
        mascot
        backHref="/"
        subtitle={t("common.wordsCount", { count: book.words.length })}
      />

      {isLessonBook(book) ? (
        <LessonListPanel book={book} />
      ) : (
        <BookDashboardPanel
          book={book}
          currentStreak={state.streak.currentStreak}
        />
      )}
    </main>
  );
}
