"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Lock, Settings, SlidersHorizontal } from "lucide-react";

import type { Book } from "@/types";
import { useAppState } from "@/store/useVocabStore";
import { computeBookStats, isBookComplete } from "@/services/stats";
import { AppHeader } from "@/components/AppHeader";
import { BookDashboardPanel } from "@/components/BookDashboardPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function SecondaryBookCard({
  book,
  prerequisite,
}: {
  book: Book;
  prerequisite?: Book;
}) {
  const stats = computeBookStats(book);
  const preStats = prerequisite ? computeBookStats(prerequisite) : undefined;

  return (
    <Link href={`/books/${book.id}`} className="block">
      <Card className="py-4 transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-bold">
              {book.locked && (
                <Lock className="size-4 shrink-0 text-muted-foreground" />
              )}
              {book.name}
            </p>
            {book.locked ? (
              <p className="text-sm text-muted-foreground">
                Unlock by mastering all of {prerequisite?.name ?? "Basic 100"}
                {preStats ? ` · ${preStats.mastered} / ${preStats.total}` : ""}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Master {stats.mastered} / {stats.total} · {stats.progress}%
              </p>
            )}
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const { state, hydrated } = useAppState();

  const primary = state.books[0];
  const others = state.books.slice(1);

  // Celebrate when a prerequisite book is fully mastered and its dependent
  // (e.g. the Supplemental List) has unlocked.
  const unlocked = hydrated
    ? state.books.find((b) => {
        if (!b.unlockAfterBookId || b.locked) return false;
        const pre = state.books.find((x) => x.id === b.unlockAfterBookId);
        return !!pre && isBookComplete(pre);
      })
    : undefined;
  const prerequisiteOf = (b: Book) =>
    b.unlockAfterBookId
      ? state.books.find((x) => x.id === b.unlockAfterBookId)
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title="Spelling Bee Trainer"
        emoji="🐝"
        action={
          <Button asChild variant="outline" size="icon" aria-label="Settings">
            <Link href="/settings">
              <Settings />
            </Link>
          </Button>
        }
      />

      {!hydrated ? (
        <Card className="h-96 animate-pulse bg-muted/60" />
      ) : (
        <>
          {unlocked && (
            <div className="flex items-center gap-3 rounded-3xl border-2 border-success/40 bg-success/10 px-5 py-4">
              <span className="text-3xl" aria-hidden>
                🏆
              </span>
              <p className="text-sm font-semibold sm:text-base">
                {prerequisiteOf(unlocked)?.name} complete! 🔓 {unlocked.name} is
                now unlocked.
              </p>
            </div>
          )}

          {/* Primary book dashboard */}
          {primary && (
            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-extrabold">{primary.name}</h2>
              <BookDashboardPanel
                book={primary}
                questionsPerTest={state.settings.questionsPerTest}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="ghost" className="flex-1">
                  <Link href={`/books/${primary.id}/words`}>
                    <BookOpen /> Manage words
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="flex-1">
                  <Link href={`/books/${primary.id}`}>
                    <SlidersHorizontal /> Book options
                  </Link>
                </Button>
              </div>
            </section>
          )}

          {/* Secondary books */}
          {others.length > 0 && (
            <section className="flex flex-col gap-3 border-t border-border pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                More books
              </h2>
              {others.map((book) => (
                <SecondaryBookCard
                  key={book.id}
                  book={book}
                  prerequisite={prerequisiteOf(book)}
                />
              ))}
            </section>
          )}
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Everything is saved on this device. 🍯
      </p>
    </main>
  );
}
