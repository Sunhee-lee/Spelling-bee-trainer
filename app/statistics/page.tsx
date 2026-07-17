"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

import type { StoredSession } from "@/storage/repository";
import { useActions, useAppState } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/** "2026-07-17" → "2026.07.17"; null → "-". */
function formatStudyDate(iso: string | null): string {
  if (!iso) return "-";
  return iso.replaceAll("-", ".");
}

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted/50 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function StatisticsView() {
  const { state, hydrated } = useAppState();
  const actions = useActions();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<StoredSession[] | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  // Load completed sessions from the active backend once hydrated.
  useEffect(() => {
    if (hydrated) void actions.loadSessions().then(setSessions);
  }, [hydrated, actions]);

  const books = state.books;
  const initialId = searchParams.get("book");
  const selectedId =
    pickedId ??
    (initialId && books.some((b) => b.id === initialId) ? initialId : null) ??
    books[0]?.id ??
    null;
  const book = books.find((b) => b.id === selectedId) ?? books[0];

  const bookStats = useMemo(() => {
    if (!book || !sessions) return null;
    const mine = sessions.filter((s) => s.bookId === book.id);
    const answered = mine.reduce((a, s) => a + s.correct + s.wrong, 0);
    const correct = mine.reduce((a, s) => a + s.correct, 0);
    const stats = computeBookStats(book);
    return {
      completedTests: mine.length,
      answered,
      // Accuracy is null (shown as "-") when nothing has been answered yet —
      // never a misleading 0%.
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
      mastered: stats.mastered,
      total: stats.total,
      progress: stats.progress,
    };
  }, [book, sessions]);

  if (!hydrated || sessions === null || !bookStats) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Card className="h-72 animate-pulse bg-muted/60" />
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
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

  const streak = state.streak;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title={t("stats.title")} emoji="📊" backHref="/" />

      {/* Book selector (only when there is more than one book). */}
      {books.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {books.map((b) => (
            <Button
              key={b.id}
              size="sm"
              variant={b.id === book.id ? "default" : "outline"}
              onClick={() => setPickedId(b.id)}
              aria-pressed={b.id === book.id}
            >
              {b.name}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-lg font-bold">{book.name}</p>
      )}

      {bookStats.completedTests === 0 ? (
        <EmptyState
          emoji="📊"
          title={t("stats.emptyTitle")}
          description={t("stats.emptyDesc")}
        >
          <Button asChild size="lg">
            <Link href={`/books/${book.id}/test?mode=today`}>
              {t("stats.startPractice")}
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          {/* Book-specific stats */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-3">
              <StatCell
                label={t("stats.completedTests")}
                value={bookStats.completedTests}
              />
              <StatCell
                label={t("stats.overallAccuracy")}
                value={
                  bookStats.accuracy === null ? "-" : `${bookStats.accuracy}%`
                }
              />
              <StatCell
                label={t("stats.questionsAnswered")}
                value={bookStats.answered}
              />
              <StatCell
                label={t("stats.masteredWords")}
                value={
                  <>
                    {bookStats.mastered}
                    <span className="text-base font-bold text-muted-foreground">
                      {" "}
                      / {bookStats.total}
                    </span>
                  </>
                }
              />
              <div className="col-span-2">
                <Progress value={bookStats.progress} indicatorClassName="bg-bee" />
              </div>
            </CardContent>
          </Card>

          {/* Account-wide streak */}
          <Card>
            <CardContent className="flex flex-col gap-3">
              <span className="text-lg font-extrabold">
                {t("stats.streakCurrentLine", { count: streak.currentStreak })}
              </span>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("stats.streakLongestLine", { count: streak.longestStreak })}
              </p>
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <CalendarDays className="size-5 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">
                  {t("stats.lastStudyDate")}
                </span>
                <span className="ml-auto text-sm font-bold tabular-nums">
                  {formatStudyDate(streak.lastStudyDate)}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
          <Card className="h-72 animate-pulse bg-muted/60" />
        </main>
      }
    >
      <StatisticsView />
    </Suspense>
  );
}
