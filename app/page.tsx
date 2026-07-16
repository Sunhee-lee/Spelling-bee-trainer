"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { useAppState } from "@/store/useVocabStore";
import { AppHeader } from "@/components/AppHeader";
import { BookCard, type BookAccent } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ACCENTS: BookAccent[] = ["bee", "grass", "sky", "berry"];

export default function HomePage() {
  const { state, hydrated } = useAppState();

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
