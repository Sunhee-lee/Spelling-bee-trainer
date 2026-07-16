"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Lock, Play } from "lucide-react";

import { useBook } from "@/store/useVocabStore";
import { AppHeader } from "@/components/AppHeader";
import { BookOptions } from "@/components/BookOptions";
import { BookProgress } from "@/components/BookProgress";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BookDashboardPage() {
  const params = useParams<{ bookId: string }>();
  const { book, hydrated } = useBook(params.bookId);

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

  const isEmpty = book.words.length === 0;
  const canTest = !book.locked && !isEmpty;

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
        <div className="flex items-center gap-2 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          Master all of Basic 100 to unlock testing. You can still prepare its
          words.
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

      {/* Primary actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {canTest ? (
          <Button asChild size="lg" className="flex-1">
            <Link href={`/books/${book.id}/test`}>
              <Play className="fill-current" /> Start Test
            </Link>
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            disabled
            title={
              book.locked ? "This book is locked" : "Add words to start a test"
            }
          >
            <Play className="fill-current" /> Start Test
          </Button>
        )}
        <Button asChild size="lg" variant="outline" className="flex-1">
          <Link href={`/books/${book.id}/words`}>
            <BookOpen /> Manage words
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
