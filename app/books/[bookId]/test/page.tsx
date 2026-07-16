"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Eye, Home, LayoutDashboard, RotateCcw, X } from "lucide-react";

import type { Word } from "@/types";
import { useActions, useAppState } from "@/store/useVocabStore";
import { buildTestWords } from "@/services/testSession";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Grade = "correct" | "wrong";

export default function TestPage() {
  const params = useParams<{ bookId: string }>();
  const { state, hydrated } = useAppState();
  const actions = useActions();
  const book = state.books.find((b) => b.id === params.bookId);

  const [questions, setQuestions] = useState<Word[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);

  // Build the test once, on the client, after the store is hydrated.
  useEffect(() => {
    if (hydrated && book && questions === null) {
      setQuestions(buildTestWords(book, state.settings));
    }
  }, [hydrated, book, questions, state.settings]);

  const total = questions?.length ?? 0;
  const finished = questions !== null && index >= total;
  const current = questions && !finished ? questions[index] : null;

  const score = useMemo(
    () => grades.filter((g) => g === "correct").length,
    [grades]
  );

  function grade(result: Grade) {
    if (!book || !current) return;
    // Apply the SRS transition for this answer, then advance the book's test
    // counter once, on the final question.
    actions.gradeWord(book.id, current.id, result);
    if (index >= total - 1) actions.completeTest(book.id);
    setGrades((prev) => [...prev, result]);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function restart() {
    if (!book) return;
    setQuestions(buildTestWords(book, state.settings));
    setIndex(0);
    setRevealed(false);
    setGrades([]);
  }

  // --- Loading / guards ----------------------------------------------------

  if (!hydrated || questions === null) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
        <Card className="h-72 animate-pulse bg-muted/60" />
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
        <EmptyState emoji="🔍" title="Book not found">
          <Button asChild>
            <Link href="/">Back to books</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  if (book.locked || total === 0) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
        <EmptyState
          emoji={book.locked ? "🔒" : "📖"}
          title={book.locked ? "This book is locked" : "No words to test"}
          description={
            book.locked
              ? "Master all of Basic 100 to unlock this book."
              : "Add some words to this book first."
          }
        >
          <Button asChild>
            <Link href={`/books/${book.id}`}>Back to book</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  // --- Finished screen -----------------------------------------------------

  if (finished) {
    const wrong = total - score;
    const percent = total === 0 ? 0 : Math.round((score / total) * 100);
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Card className="items-center gap-4 py-10 text-center">
          <div className="text-6xl" aria-hidden>
            {percent >= 80 ? "🏆" : percent >= 50 ? "🌟" : "🐝"}
          </div>
          <h1 className="text-2xl font-extrabold">
            {percent >= 80 ? "Amazing work!" : "Great effort!"}
          </h1>
          <p className="text-5xl font-extrabold tabular-nums">
            {score}
            <span className="text-2xl text-muted-foreground"> / {total}</span>
          </p>
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-4 py-1.5 font-semibold text-success">
              <Check className="size-4" /> {score} correct
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-4 py-1.5 font-semibold text-destructive">
              <X className="size-4" /> {wrong} wrong
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={restart}>
            <RotateCcw /> Test again
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link href={`/books/${book.id}`}>
                <LayoutDashboard /> Book dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link href="/">
                <Home /> Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // --- Active question -----------------------------------------------------

  const progress = (index / total) * 100;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title={book.name} emoji="🐝" backHref={`/books/${book.id}`} />

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-sm font-semibold text-muted-foreground">
          <span>
            Question {index + 1} of {total}
          </span>
          <span className="tabular-nums">
            {score} correct
          </span>
        </div>
        <Progress value={progress} indicatorClassName="bg-grass" />
      </div>

      {current && (
        <Card className="items-center gap-6 py-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Meaning
          </span>
          <p className="px-4 text-4xl font-extrabold leading-tight sm:text-5xl">
            {current.meaning}
          </p>

          {revealed ? (
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-secondary px-6 py-4">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Answer
              </span>
              <p className="text-3xl font-extrabold text-primary sm:text-4xl">
                <span className="text-muted-foreground">{current.number}. </span>
                {current.word}
              </p>
            </div>
          ) : (
            <p className="max-w-xs text-sm text-muted-foreground">
              Say the English word out loud, then spell it letter by letter.
            </p>
          )}
        </Card>
      )}

      {/* Controls */}
      {!revealed ? (
        <Button size="xl" className="w-full" onClick={() => setRevealed(true)}>
          <Eye /> Show answer
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="xl"
            variant="success"
            onClick={() => grade("correct")}
          >
            <Check /> Correct
          </Button>
          <Button
            size="xl"
            variant="destructive"
            onClick={() => grade("wrong")}
          >
            <X /> Wrong
          </Button>
        </div>
      )}
    </main>
  );
}
