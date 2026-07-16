"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import type { Book } from "@/types";
import { useAppState } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BookDashboardPanel } from "@/components/BookDashboardPanel";
import { BookOptions } from "@/components/BookOptions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/** Locked screen for a dependent book (e.g. Supplemental List). No learning UI. */
function LockedBookScreen({ book, prerequisite }: { book: Book; prerequisite?: Book }) {
  const { t } = useTranslation();
  const preStats = prerequisite ? computeBookStats(prerequisite) : undefined;
  const preName = prerequisite?.name ?? "Basic 100";
  const remaining = preStats ? preStats.total - preStats.mastered : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title={book.name} backHref="/" />

      <Card className="items-center gap-3 py-10 text-center">
        <div className="text-6xl" aria-hidden>
          🔒
        </div>
        <h1 className="text-2xl font-extrabold">{book.name}</h1>
        <p className="max-w-sm px-4 text-sm text-muted-foreground">
          {t("book.lockedUnlockMsg", { prereq: preName })}
        </p>
      </Card>

      {preStats && (
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
  const params = useParams<{ bookId: string }>();
  const { state, hydrated } = useAppState();
  const { t } = useTranslation();
  const book = state.books.find((b) => b.id === params.bookId);

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
          emoji="🔍"
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
        emoji="🐝"
        backHref="/"
        subtitle={t("common.wordsCount", { count: book.words.length })}
      />

      <BookDashboardPanel
        book={book}
        questionsPerTest={state.settings.questionsPerTest}
      />

      {/* Book options only for user-created books (built-in names stay fixed). */}
      {!book.builtIn && (
        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("book.bookOptions")}
          </h2>
          <BookOptions book={book} />
        </section>
      )}
    </main>
  );
}
