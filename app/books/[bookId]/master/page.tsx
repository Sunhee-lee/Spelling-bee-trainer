"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Trophy } from "lucide-react";

import { useBook } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function MasterCollectionPage() {
  const params = useParams<{ bookId: string }>();
  const { book, hydrated } = useBook(params.bookId);

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
        <EmptyState emoji="🔍" title="Book not found">
          <Button asChild>
            <Link href="/">Back to books</Link>
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
        title="Master Words"
        emoji="🏆"
        backHref={`/books/${book.id}`}
        subtitle={book.name}
      />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-muted-foreground">Mastered</span>
            <span className="tabular-nums">
              {stats.mastered} / {stats.total} · {stats.progress}%
            </span>
          </div>
          <Progress value={stats.progress} indicatorClassName="bg-bee" />
        </CardContent>
      </Card>

      {mastered.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="No master words yet"
          description="Answer a word correctly 4 times in a row to master it."
        >
          <Button asChild>
            <Link href={`/books/${book.id}`}>Back to book</Link>
          </Button>
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
              Review master words
            </Link>
          </Button>
        </>
      )}
    </main>
  );
}
