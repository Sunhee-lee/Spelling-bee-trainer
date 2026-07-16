"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock, Play, Plus, Upload } from "lucide-react";

import { useBook } from "@/store/useVocabStore";
import { AppHeader } from "@/components/AppHeader";
import { BookOptions } from "@/components/BookOptions";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { EmptyState } from "@/components/EmptyState";
import { ExportButton } from "@/components/ExportButton";
import { WordFormDialog } from "@/components/WordFormDialog";
import { WordRow } from "@/components/WordRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BookManagePage() {
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

  const canTest = !book.locked && book.words.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={book.name}
        backHref="/"
        subtitle={`${book.words.length} ${
          book.words.length === 1 ? "word" : "words"
        }`}
        action={
          canTest ? (
            <Button asChild size="icon" aria-label="Start test">
              <Link href={`/books/${book.id}/test`}>
                <Play className="fill-current" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      {book.locked && (
        <div className="flex items-center gap-2 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          This book is locked for testing, but you can still prepare its words.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <WordFormDialog
          bookId={book.id}
          trigger={
            <Button className="flex-1 sm:flex-none">
              <Plus /> Add word
            </Button>
          }
        />
        <BulkImportDialog
          book={book}
          trigger={
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Upload /> Bulk import
            </Button>
          }
        />
        <ExportButton book={book} />
      </div>

      {/* Word list */}
      {book.words.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="No words yet"
          description="Add words one at a time, or paste a whole list with Bulk import."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <ul className="divide-y divide-border">
            {book.words.map((word) => (
              <WordRow key={word.id} bookId={book.id} word={word} />
            ))}
          </ul>
        </Card>
      )}

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
