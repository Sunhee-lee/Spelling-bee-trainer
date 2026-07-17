"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Search, Trophy } from "lucide-react";

import { useBook } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { HiveBeeIcon } from "@/components/HiveBeeIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function MasterCollectionPage() {
  const params = useParams<{ bookId: string }>();
  const { book, hydrated } = useBook(params.bookId);
  const { t } = useTranslation();

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Card className="h-64 animate-pulse bg-muted/60" />
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <EmptyState icon={<Search />} title={t("common.bookNotFound")}>
          <Button asChild>
            <Link href="/">{t("common.backToBooks")}</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  const stats = computeBookStats(book);
  const mastered = [...book.words]
    .filter((w) => w.mastered)
    .sort((a, b) => a.number - b.number);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={t("master.title")}
        icon={<Trophy className="size-7 text-bee sm:size-8" />}
        backHref={`/books/${book.id}`}
        subtitle={book.name}
      />

      {/* Only show progress when the book actually has words (avoid 0 / 0 · 0%). */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-muted-foreground">
                {t("progress.mastered")}
              </span>
              <span className="tabular-nums">
                {stats.mastered} / {stats.total}
                {stats.mastered > 0 ? ` · ${stats.progress}%` : ""}
              </span>
            </div>
            <Progress value={stats.progress} indicatorClassName="bg-bee" />
          </CardContent>
        </Card>
      )}

      {mastered.length === 0 ? (
        <EmptyState
          icon={<HiveBeeIcon />}
          title={t("master.noMasterYet")}
          description={t("master.noMasterDesc")}
        >
          <div className="flex flex-col items-center gap-3">
            {!book.locked && book.words.length > 0 && (
              <Button asChild size="lg">
                <Link href={`/books/${book.id}/test?mode=today`}>
                  {t("book.todayPractice")}
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/books/${book.id}`}>
                {t("master.backToBook", { book: book.name })}
              </Link>
            </Button>
          </div>
        </EmptyState>
      ) : (
        <>
          <Card className="overflow-hidden py-0">
            <ul className="divide-y divide-border">
              {mastered.map((word) => (
                <li key={word.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-muted-foreground">
                    {word.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{word.word}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {word.meaning}
                    </p>
                  </div>
                  <Trophy className="size-5 shrink-0 text-bee" />
                </li>
              ))}
            </ul>
          </Card>

          {/* Optional maintenance check — not a primary CTA. */}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/books/${book.id}/test?mode=master`}>
              {t("master.reviewMaster")}
            </Link>
          </Button>
        </>
      )}
    </main>
  );
}
