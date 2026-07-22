"use client";

import Link from "next/link";
import { useBookId } from "@/lib/useBookId";
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Lock,
  Play,
  Search,
} from "lucide-react";

import type { Book } from "@/types";
import { useAppState } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { isLessonBook } from "@/services/lessons";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BookDashboardPanel } from "@/components/BookDashboardPanel";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title={book.name} backHref="/" />

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

      {/* Tests are disabled while practice is locked… */}
      <Button size="xl" className="w-full py-5" disabled>
        <Play className="fill-current" /> {t("book.todayPractice")}
      </Button>
      <Button size="lg" variant="outline" className="w-full" disabled>
        <ClipboardCheck /> {t("book.fullTest")}
      </Button>

      {/* …but flashcard learning stays available (only testing is locked). */}
      {book.words.length > 0 && (
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href={`/learn/${book.id}`}>
            <GraduationCap /> {t("learn.title")}
          </Link>
        </Button>
      )}

      {/* Words can be managed in advance. */}
      <Button asChild size="lg" className="w-full">
        <Link href={`/books/${book.id}/words`}>
          <BookOpen /> {t("book.manageWordsCta")}
        </Link>
      </Button>

      {preStats && preStats.total > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("book.lockedProgressLabel")}
            </span>
            <Progress value={preStats.progress} indicatorClassName="bg-bee" />
            <div className="flex flex-col gap-1 text-sm font-semibold">
              <span>
                {t("book.lockedCurrent", {
                  mastered: preStats.mastered,
                  total: preStats.total,
                })}
              </span>
              <span className="text-muted-foreground">
                {t("book.lockedRemaining", { count: remaining })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
