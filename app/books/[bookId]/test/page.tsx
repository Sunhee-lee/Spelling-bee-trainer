"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Check, Eye, Home, LayoutDashboard, RotateCcw, X } from "lucide-react";

import type { Word } from "@/types";
import { useActions, useAppState } from "@/store/useVocabStore";
import {
  buildFullTestWords,
  buildMasterReviewWords,
  buildTestWords,
  pickWordsByIds,
} from "@/services/testSession";
import { useTranslation, type TKey } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Grade = "correct" | "wrong";
type Mode = "today" | "full" | "master";

const MODE_LABEL_KEY: Record<Mode, TKey> = {
  today: "test.modeToday",
  full: "test.modeFull",
  master: "test.modeMaster",
};

function parseMode(value: string | null): Mode {
  return value === "full" || value === "master" ? value : "today";
}

function TestRunner() {
  const params = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const mode = parseMode(searchParams.get("mode"));

  const { state, hydrated } = useAppState();
  const actions = useActions();
  const { t } = useTranslation();
  const book = state.books.find((b) => b.id === params.bookId);

  const [questions, setQuestions] = useState<Word[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  // True while replaying missed words — this run must not advance currentTest.
  const [isRetry, setIsRetry] = useState(false);

  // Build the initial test once, on the client, after the store is hydrated.
  useEffect(() => {
    if (hydrated && book && questions === null) {
      const initial =
        mode === "full"
          ? buildFullTestWords(book)
          : mode === "master"
            ? buildMasterReviewWords(book)
            : buildTestWords(book, state.settings);
      setQuestions(initial);
    }
  }, [hydrated, book, questions, state.settings, mode]);

  const total = questions?.length ?? 0;
  const finished = questions !== null && index >= total;
  const current = questions && !finished ? questions[index] : null;

  const score = useMemo(
    () => grades.filter((g) => g === "correct").length,
    [grades]
  );

  // Record finished scheduling runs (today / full) to test history, once.
  const recorded = useRef(false);
  useEffect(() => {
    if (
      finished &&
      !recorded.current &&
      book &&
      questions &&
      !isRetry &&
      (mode === "today" || mode === "full")
    ) {
      recorded.current = true;
      actions.recordSession({
        bookId: book.id,
        score,
        correct: score,
        wrong: total - score,
        answers: questions.map((q, i) => ({
          wordId: q.id,
          correct: grades[i] === "correct",
        })),
      });
    }
  }, [finished, book, questions, isRetry, mode, score, total, grades, actions]);

  function grade(result: Grade) {
    if (!book || !current) return;
    actions.gradeWord(book.id, current.id, result);
    // Advance the book's test counter once, when a scheduling run ends.
    // Master Check and Wrong-answer retry are maintenance only — they update
    // each word's SRS state but must not move the shared test schedule.
    const advancesSchedule = !isRetry && mode !== "master";
    if (index >= total - 1 && advancesSchedule) actions.completeTest(book.id);
    setGrades((prev) => [...prev, result]);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function retryWrong() {
    if (!book || !questions) return;
    const wrongIds = questions
      .filter((_, i) => grades[i] === "wrong")
      .map((q) => q.id);
    setQuestions(pickWordsByIds(book, wrongIds));
    setIndex(0);
    setRevealed(false);
    setGrades([]);
    setIsRetry(true);
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
        <EmptyState emoji="🔍" title={t("common.bookNotFound")}>
          <Button asChild>
            <Link href="/">{t("common.backToBooks")}</Link>
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
          title={
            book.locked ? t("test.lockedTitle") : t("test.nothingToPractice")
          }
          description={
            book.locked
              ? t("test.lockedDesc")
              : mode === "master"
                ? t("test.noMasteredDesc")
                : t("test.addWordsFirst")
          }
        >
          <Button asChild>
            <Link href={`/books/${book.id}`}>{t("common.backToBook")}</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  // --- Finished screen -----------------------------------------------------

  if (finished) {
    const wrong = total - score;
    const percent = total === 0 ? 0 : Math.round((score / total) * 100);
    const allCorrect = wrong === 0;

    // Compare the pre-run snapshot (questions) with the post-grade store state.
    const currentWord = (id: string) => book.words.find((w) => w.id === id);
    const newlyMastered = questions.filter(
      (q) => !q.mastered && currentWord(q.id)?.mastered
    );
    const demoted = questions.filter(
      (q) => q.mastered && currentWord(q.id)?.mastered === false
    );

    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Card className="items-center gap-4 py-10 text-center">
          <div className="text-6xl" aria-hidden>
            {allCorrect ? "🎉" : percent >= 80 ? "🏆" : percent >= 50 ? "🌟" : "🐝"}
          </div>
          <h1 className="text-2xl font-extrabold">
            {isRetry && allCorrect
              ? t("test.allCorrected")
              : percent >= 80
                ? t("test.amazing")
                : t("test.greatEffort")}
          </h1>
          <p className="text-5xl font-extrabold tabular-nums">
            {score}
            <span className="text-2xl text-muted-foreground"> / {total}</span>
          </p>
          <p className="text-sm font-semibold text-muted-foreground">
            {t("test.accuracy", { percent })}
          </p>
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-4 py-1.5 font-semibold text-success">
              <Check className="size-4" /> {t("test.correctChip", { count: score })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-4 py-1.5 font-semibold text-destructive">
              <X className="size-4" /> {t("test.wrongChip", { count: wrong })}
            </span>
          </div>
        </Card>

        {newlyMastered.length > 0 && (
          <div className="rounded-3xl border-2 border-success/40 bg-success/10 px-5 py-4">
            <p className="text-lg font-extrabold text-success">
              {t("test.newlyMastered", { count: newlyMastered.length })}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {newlyMastered.map((word) => (
                <li key={word.id} className="flex items-center gap-2 font-semibold">
                  <span className="text-success">✓</span>
                  <span className="tabular-nums text-muted-foreground">
                    {word.number}.
                  </span>
                  {word.word}
                </li>
              ))}
            </ul>
          </div>
        )}

        {demoted.length > 0 && (
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
            <p className="font-bold">
              {t("test.backToLearning", { count: demoted.length })}
            </p>
            <p className="text-muted-foreground">
              {demoted.map((w) => `${w.number}. ${w.word}`).join(", ")}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {wrong > 0 && (
            <Button size="lg" onClick={retryWrong}>
              <RotateCcw /> {t("test.practiceWrong", { count: wrong })}
            </Button>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link href={`/books/${book.id}`}>
                <LayoutDashboard /> {t("test.finish")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link href="/">
                <Home /> {t("test.home")}
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // --- Active question -----------------------------------------------------

  const progress = (index / total) * 100;
  const heading = isRetry ? t("test.modeWrong") : t(MODE_LABEL_KEY[mode]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title={heading} emoji="🐝" backHref={`/books/${book.id}`} />

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-sm font-semibold text-muted-foreground">
          <span>{t("test.questionOf", { current: index + 1, total })}</span>
          <span className="tabular-nums">
            {t("test.correctCount", { count: score })}
          </span>
        </div>
        <Progress value={progress} indicatorClassName="bg-grass" />
      </div>

      {current && (
        <Card className="items-center gap-6 py-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("test.meaning")}
          </span>
          <p className="px-4 text-4xl font-extrabold leading-tight sm:text-5xl">
            {current.meaning}
          </p>

          {revealed ? (
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-secondary px-6 py-4">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("test.answer")}
              </span>
              <p className="text-3xl font-extrabold text-primary sm:text-4xl">
                <span className="text-muted-foreground">{current.number}. </span>
                {current.word}
              </p>
            </div>
          ) : (
            <p className="max-w-xs text-sm text-muted-foreground">
              {t("test.sayOutLoud")}
            </p>
          )}
        </Card>
      )}

      {/* Controls */}
      {!revealed ? (
        <Button size="xl" className="w-full" onClick={() => setRevealed(true)}>
          <Eye /> {t("test.showAnswer")}
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button size="xl" variant="success" onClick={() => grade("correct")}>
            <Check /> {t("test.correct")}
          </Button>
          <Button size="xl" variant="destructive" onClick={() => grade("wrong")}>
            <X /> {t("test.wrong")}
          </Button>
        </div>
      )}
    </main>
  );
}

export default function TestPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
          <Card className="h-72 animate-pulse bg-muted/60" />
        </main>
      }
    >
      <TestRunner />
    </Suspense>
  );
}
