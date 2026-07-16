"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Upload } from "lucide-react";

import { useBook } from "@/store/useVocabStore";
import { AppHeader } from "@/components/AppHeader";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { EmptyState } from "@/components/EmptyState";
import { ExportButton } from "@/components/ExportButton";
import { WordFormDialog } from "@/components/WordFormDialog";
import { WordRow } from "@/components/WordRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ManageWordsPage() {
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title="Manage words"
        backHref={`/books/${book.id}`}
        subtitle={`${book.name} · ${book.words.length} ${
          book.words.length === 1 ? "word" : "words"
        }`}
      />

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
            {[...book.words]
              .sort((a, b) => a.number - b.number)
              .map((word) => (
                <WordRow key={word.id} bookId={book.id} word={word} />
              ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
