"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Lock, Settings } from "lucide-react";

import { useAppState } from "@/store/useVocabStore";
import { computeBookStats } from "@/services/stats";
import { AppHeader } from "@/components/AppHeader";
import { BookDashboardPanel } from "@/components/BookDashboardPanel";
import { BookOptions } from "@/components/BookOptions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

      <BookDashboardPanel
        book={book}
        questionsPerTest={state.settings.questionsPerTest}
      />

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
