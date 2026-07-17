"use client";

import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";

import type { Book } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

interface BookSettingsRowProps {
  book: Book;
  /** Name of the prerequisite book (for the locked description). */
  prerequisiteName?: string;
}

/**
 * A single, tappable book row inside Settings → Vocabulary books. This section
 * is about managing a book's words, so every row opens straight into Manage
 * Words (learning lives on the Home dashboard, not here). A locked book (e.g.
 * the Supplemental List) opens the same word list — words can be added while
 * practice is locked — and shows a "Practice Locked" badge instead of "no
 * access".
 */
export function BookSettingsRow({ book, prerequisiteName }: BookSettingsRowProps) {
  const { t } = useTranslation();
  const prereq = prerequisiteName ?? "Basic 100";

  return (
    <Link
      href={`/books/${book.id}/words`}
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
        {book.locked && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("book.practiceLockedDesc", { prereq })}
          </p>
        )}
      </div>
      {book.locked && (
        <Badge variant="muted" className="shrink-0 gap-1">
          <Lock className="size-3.5" /> {t("book.practiceLocked")}
        </Badge>
      )}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
