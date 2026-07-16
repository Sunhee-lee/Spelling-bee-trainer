"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { useAppState } from "@/store/useVocabStore";
import { isBookComplete } from "@/services/stats";
import { AppHeader } from "@/components/AppHeader";
import { BookCard, type BookAccent } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ACCENTS: BookAccent[] = ["bee", "grass", "sky", "berry"];

export default function HomePage() {
  const { state, hydrated } = useAppState();

  // Celebrate when a prerequisite book is fully mastered and its dependent
  // (e.g. the Supplemental List) has unlocked.
  const unlocked = hydrated
    ? state.books.find((b) => {
        if (!b.unlockAfterBookId || b.locked) return false;
        const pre = state.books.find((x) => x.id === b.unlockAfterBookId);
        return !!pre && isBookComplete(pre);
      })
    : undefined;
  const prerequisite = unlocked
    ? state.books.find((x) => x.id === unlocked.unlockAfterBookId)
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title="Spelling Bee Trainer"
        emoji="🐝"
        subtitle="Pick a book and start practicing!"
        action={
          <Button asChild variant="outline" size="icon" aria-label="Settings">
            <Link href="/settings">
              <Settings />
            </Link>
          </Button>
        }
      />

      {unlocked && prerequisite && (
        <div className="flex items-center gap-3 rounded-3xl border-2 border-success/40 bg-success/10 px-5 py-4">
          <span className="text-3xl" aria-hidden>
            🏆
          </span>
          <p className="text-sm font-semibold sm:text-base">
            {prerequisite.name} complete! 🔓 {unlocked.name} is now unlocked.
          </p>
        </div>
      )}

      {!hydrated ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="h-64 animate-pulse bg-muted/60" />
          <Card className="h-64 animate-pulse bg-muted/60" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {state.books.map((book, i) => (
            <BookCard
              key={book.id}
              book={book}
              accent={ACCENTS[i % ACCENTS.length]}
            />
          ))}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Everything is saved on this device. 🍯
      </p>
    </main>
  );
}
