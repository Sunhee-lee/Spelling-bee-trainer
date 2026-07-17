"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Plus, Search, Upload } from "lucide-react";

import { useBook } from "@/store/useVocabStore";
import { useTranslation } from "@/lib/i18n";
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={t("words.title")}
        backHref={`/books/${book.id}`}
        subtitle={t("words.subtitle", {
          book: book.name,
          count: book.words.length,
        })}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <WordFormDialog
          bookId={book.id}
          trigger={
            <Button className="flex-1 sm:flex-none">
              <Plus /> {t("words.addWord")}
            </Button>
          }
        />
        <BulkImportDialog
          book={book}
          trigger={
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Upload /> {t("words.bulkImport")}
            </Button>
          }
        />
        <ExportButton book={book} />
      </div>

      {/* Word list */}
      {book.words.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title={t("words.noWordsYet")}
          description={t("words.noWordsDesc")}
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
