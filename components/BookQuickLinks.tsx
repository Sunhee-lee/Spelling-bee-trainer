"use client";

import Link from "next/link";
import { BarChart3, BookOpen, Trophy } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/**
 * The utility links pinned to the bottom of every book screen (and the home
 * screen). Kept in one component so the set, order, and styling stay identical
 * everywhere: View Mastered Words · Statistics · Manage Words.
 */
export function BookQuickLinks({ bookId }: { bookId: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-1 flex flex-col gap-1 border-t border-border pt-5">
      <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
        <Link href={`/books/${bookId}/master`}>
          <Trophy /> {t("book.viewMaster")}
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
        <Link href={`/statistics?book=${bookId}`}>
          <BarChart3 /> {t("stats.link")}
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
        <Link href={`/books/${bookId}/words`}>
          <BookOpen /> {t("book.manageWords")}
        </Link>
      </Button>
    </div>
  );
}
