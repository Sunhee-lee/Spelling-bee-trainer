"use client";

import Link from "next/link";
import { ChevronRight, Lock, Upload } from "lucide-react";

import type { Book } from "@/types";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { ExportButton } from "@/components/ExportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BookSettingsRowProps {
  book: Book;
}

/**
 * A book entry inside Settings → Vocabulary books, exposing the per-book
 * actions the PRD groups here: Bulk import, Export CSV, and Manage (which also
 * covers rename / reset progress / delete).
 */
export function BookSettingsRow({ book }: BookSettingsRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{book.name}</p>
          <p className="text-sm text-muted-foreground">
            {book.words.length} {book.words.length === 1 ? "word" : "words"}
          </p>
        </div>
        {book.locked && (
          <Badge variant="muted" className="gap-1">
            <Lock className="size-3.5" /> Locked
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <BulkImportDialog
          book={book}
          trigger={
            <Button variant="secondary" size="sm">
              <Upload /> Bulk import
            </Button>
          }
        />
        <ExportButton book={book} size="sm" variant="secondary" />
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href={`/books/${book.id}`}>
            Manage <ChevronRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
