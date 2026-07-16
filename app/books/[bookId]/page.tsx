"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  Lock,
  Play,
  Settings,
  Trophy,
} from "lucide-react";

import { useAppState } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { AppHeader } from "@/components/AppHeader";
import { BookOptions } from "@/components/BookOptions";
import { BookProgress } from "@/components/BookProgress";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BookDashboardPage() {
  const params = useParams<{ bookId: string }>();
  const { state, hydrated } = useAppState();
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
          title="Book not found"
          description="This book may have been deleted."
        >
          <Button asChild>
            <Link href="/">Back to books</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  const stats = computeBookStats(book);
  const isEmpty = stats.total === 0;
  const canTest = !book.locked && !isEmpty;

  const prerequisite = book.unlockAfterBookId
    ? state.books.find((b) => b.id === book.unlockAfterBookId)
    : undefined;
  const preStats = prerequisite ? computeBookStats(prerequisite) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={book.name}
        emoji="🐝"
        backHref="/"
        subtitle={`${book.words.length} ${
          book.words.length === 1 ? "word" : "words"
        }`}
      />

      {book.locked && (
        <div className="flex items-start gap-3 rounded-2xl bg-muted/70 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold">
              Unlock by mastering all of {prerequisite?.name ?? "Basic 100"}
            </p>
            {preStats && (
              <p className="text-muted-foreground">
                {prerequisite?.name} progress: {preStats.mastered} /{" "}
                {preStats.total}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardContent>
          {isEmpty ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No words yet — add some to start tracking progress.
            </p>
          ) : (
            <BookProgress book={book} />
          )}
        </CardContent>
      </Card>

      {/* Primary CTA: Today's Practice */}
      <Button
        asChild={canTest}
        size="xl"
        className="w-full flex-col gap-0.5 py-5"
        disabled={!canTest}
        title={
          book.locked
            ? "This book is locked"
            : isEmpty
              ? "Add words to start practicing"
              : undefined
        }
      >
        {canTest ? (
          <Link href={`/books/${book.id}/test?mode=today`}>
            <span className="flex items-center gap-2">
              <Play className="fill-current" /> Start Today&rsquo;s Practice
            </span>
            <span className="text-xs font-medium opacity-80">
              {state.settings.questionsPerTest} questions · auto-selected
            </span>
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            <Play className="fill-current" /> Start Today&rsquo;s Practice
          </span>
        )}
      </Button>

      {/* Secondary CTA: Full Test */}
      <Button
        asChild={canTest}
        size="lg"
        variant="outline"
        className="w-full"
        disabled={!canTest}
      >
        {canTest ? (
          <Link href={`/books/${book.id}/test?mode=full`}>
            <ClipboardCheck /> Full Test · all {stats.total} words
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            <ClipboardCheck /> Full Test
          </span>
        )}
      </Button>

      {/* Master collection */}
      <Button asChild size="lg" variant="secondary" className="w-full">
        <Link href={`/books/${book.id}/master`}>
          <Trophy /> Master Words · {stats.mastered} / {stats.total}
        </Link>
      </Button>

      {/* Manage & settings */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg" variant="ghost" className="flex-1">
          <Link href={`/books/${book.id}/words`}>
            <BookOpen /> Manage words
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost" className="flex-1">
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </Button>
      </div>

      {/* Book options */}
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Book options
        </h2>
        <BookOptions book={book} />
      </section>
    </main>
  );
}
