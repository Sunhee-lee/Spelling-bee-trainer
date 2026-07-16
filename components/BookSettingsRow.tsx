"use client";

import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";

import type { Book } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

interface BookSettingsRowProps {
  book: Book;
}

/**
 * A single, tappable book row inside Settings → Vocabulary books. Opening the
 * book (its dashboard / Manage Words) is where the per-book actions live, so
 * the Settings list stays clean.
 */
export function BookSettingsRow({ book }: BookSettingsRowProps) {
  const { t } = useTranslation();
  return (
    <Link
      href={`/books/${book.id}`}
      className="flex items-center gap-3 rounded-2xl border-2 border-border px-4 py-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-semibold">
          {book.locked && (
            <Lock className="size-4 shrink-0 text-muted-foreground" />
          )}
          {book.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("common.wordsCount", { count: book.words.length })}
        </p>
      </div>
      {book.locked && (
        <Badge variant="muted" className="gap-1">
          <Lock className="size-3.5" /> {t("common.locked")}
        </Badge>
      )}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
