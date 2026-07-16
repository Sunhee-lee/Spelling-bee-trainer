import Link from "next/link";
import { ClipboardCheck, Play, Trophy } from "lucide-react";

import type { Book } from "@/types";
import { computeBookStats } from "@/services/stats";
import { BookProgress } from "@/components/BookProgress";
import { Button } from "@/components/ui/button";

interface BookDashboardPanelProps {
  book: Book;
  /** Questions per test, shown as the Today's Practice subtitle. */
  questionsPerTest: number;
}

/**
 * The core learning panel for a book: a motivational "words remaining" line,
 * the progress summary, and the Today's Practice / Full Test / Master Words
 * actions. Shared by the main home (primary book) and each book dashboard.
 */
export function BookDashboardPanel({
  book,
  questionsPerTest,
}: BookDashboardPanelProps) {
  const stats = computeBookStats(book);
  const isEmpty = stats.total === 0;
  const canTest = !book.locked && !isEmpty;
  const remaining = stats.total - stats.mastered;
  const isComplete = stats.total > 0 && remaining === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Motivation: words remaining */}
      {!isEmpty &&
        (isComplete ? (
          <p className="rounded-2xl bg-success/10 px-4 py-3 text-center text-sm font-bold text-success">
            🎉 {book.name} is fully mastered!
          </p>
        ) : (
          <p className="rounded-2xl bg-bee/15 px-4 py-3 text-center text-sm font-semibold">
            <span className="text-lg font-extrabold tabular-nums">
              {remaining}
            </span>{" "}
            {remaining === 1 ? "word" : "words"} remaining until {book.name} is
            fully mastered.
          </p>
        ))}

      <BookProgress book={book} />

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
              <Play className="fill-current" /> Today&rsquo;s Practice
            </span>
            <span className="text-xs font-medium opacity-80">
              {questionsPerTest} questions · auto-selected
            </span>
          </Link>
        ) : (
          <span className="flex items-center gap-2">
            <Play className="fill-current" /> Today&rsquo;s Practice
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

      {/* Master Words */}
      <Button asChild size="lg" variant="secondary" className="w-full">
        <Link href={`/books/${book.id}/master`}>
          <Trophy /> Master Words · {stats.mastered} / {stats.total}
        </Link>
      </Button>
    </div>
  );
}
