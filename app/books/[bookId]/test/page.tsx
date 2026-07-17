"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Check,
  Eye,
  LayoutDashboard,
  Play,
  RotateCcw,
  Sprout,
  X,
} from "lucide-react";

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
import { Celebration } from "@/components/Celebration";
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
  // Scheduling runs (today / full) show a confirmation screen before starting.
  const [started, setStarted] = useState(false);
  // "Continue Learning" starts a fresh Today's Practice regardless of the URL
  // mode; when set it overrides the mode derived from the query string.
  const [forcedMode, setForcedMode] = useState<Mode | null>(null);
  const effMode = forcedMode ?? mode;

  // Build the initial test once, on the client, after the store is hydrated.
  useEffect(() => {
    if (hydrated && book && questions === null) {
      const initial =
        effMode === "full"
          ? buildFullTestWords(book)
          : effMode === "master"
            ? buildMasterReviewWords(book)
            : buildTestWords(book, state.settings);
      setQuestions(initial);
    }
  }, [hydrated, book, questions, state.settings, effMode]);

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
      (effMode === "today" || effMode === "full")
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
  }, [finished, book, questions, isRetry, effMode, score, total, grades, actions]);

  // Record the daily learning streak once per completed scheduling / master run
  // (never for wrong-answer retries). The store is idempotent per calendar day,
  // so refreshes and multiple tests the same day can't double-count.
  const streakDone = useRef(false);
  useEffect(() => {
    if (
      finished &&
      !streakDone.current &&
      book &&
      !isRetry &&
      (effMode === "today" || effMode === "full" || effMode === "master")
    ) {
      streakDone.current = true;
      actions.registerStudyDay();
    }
  }, [finished, book, isRetry, effMode, actions]);

  function grade(result: Grade) {
    if (!book || !current) return;
    actions.gradeWord(book.id, current.id, result);
    // Advance the book's test counter once, when a scheduling run ends.
    // Master Check and Wrong-answer retry are maintenance only — they update
    // each word's SRS state but must not move the shared test schedule.
    const advancesSchedule = !isRetry && effMode !== "master";
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

  /**
   * "Continue Learning": start another Today's Practice for this book. Rebuilds
   * a fresh SRS selection and shows the pre-test confirmation screen again — it
   * never jumps straight into questions.
   */
  function continueLearning() {
    setForcedMode("today");
    setQuestions(null); // triggers a fresh build for Today's Practice
    setIndex(0);
    setRevealed(false);
    setGrades([]);
    setIsRetry(false);
    setStarted(false);
    recorded.current = false;
    streakDone.current = false;
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
              : effMode === "master"
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

  // --- Pre-test confirmation screen ----------------------------------------
  // Scheduling runs (today / full) confirm the question count, breakdown, and
  // an estimated time before the first question. Master / retry runs skip it.

  if (!started && (effMode === "today" || effMode === "full")) {
    const reviewN = questions.filter(
      (w) => !w.mastered && w.nextReviewTest <= book.currentTest
    ).length;
    const masteredN = questions.filter((w) => w.mastered).length;
    const learningN = total - reviewN - masteredN;
    // ~9 seconds per question, rounded to whole minutes (at least 1).
    const minutes = Math.max(1, Math.round((total * 9) / 60));

    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <AppHeader
          title={t(MODE_LABEL_KEY[effMode])}
          mascot
          backHref={`/books/${book.id}`}
        />

        <Card className="items-center gap-4 py-10 text-center">
          <div className="text-5xl" aria-hidden>
            📝
          </div>
          <h1 className="text-2xl font-extrabold">{t(MODE_LABEL_KEY[effMode])}</h1>
          <p className="text-4xl font-extrabold tabular-nums">
            {t("test.questionCount", { count: total })}
          </p>
          <div className="flex flex-col gap-1 text-sm font-semibold text-muted-foreground">
            <span>{t("test.introLearning", { count: learningN })}</span>
            <span>{t("test.introReview", { count: reviewN })}</span>
            {masteredN > 0 && (
              <span>{t("test.introMaster", { count: masteredN })}</span>
            )}
            <span>{t("test.estimatedTime", { count: minutes })}</span>
          </div>
        </Card>

        <Button size="xl" className="w-full" onClick={() => setStarted(true)}>
          <Play className="fill-current" /> {t("test.start")}
        </Button>
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

    // Encouraging, never-discouraging message chosen by accuracy.
    const messageKey: TKey = allCorrect
      ? "test.msgPerfect"
      : percent >= 80
        ? "test.msgGreat"
        : "test.msgFinish";
    const bigEmoji = allCorrect
      ? "🌟"
      : newlyMastered.length > 0
        ? "🏆"
        : percent >= 80
          ? "🎉"
          : "👏";

    // Mode-completion subtitle.
    const completeKey: TKey = isRetry
      ? "test.completeRetry"
      : effMode === "full"
        ? "test.completeFull"
        : effMode === "master"
          ? "test.completeMaster"
          : "test.completeToday";

    // A streak line is shown only for a counted completion (not a retry) once
    // the learner is on a run of 2+ days.
    const showStreak = !isRetry && state.streak.currentStreak >= 2;

    // Stronger celebration on a perfect score or any newly mastered word.
    const intensity =
      allCorrect || newlyMastered.length > 0 ? "strong" : "calm";

    return (
      <main className="relative mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Celebration intensity={intensity} />

        <Card className="sbt-pop-in items-center gap-3 py-10 text-center">
          <div className="text-6xl" aria-hidden>
            {bigEmoji}
          </div>
          <h1 className="text-2xl font-extrabold">
            {isRetry && allCorrect ? t("test.allCorrected") : t(messageKey)}
          </h1>
          <p className="text-sm font-semibold text-muted-foreground">
            {t(completeKey)}
          </p>

          <div className="mt-2 flex flex-col items-center gap-1">
            <p className="text-base font-bold">
              {t("test.questionsCompleted", { count: total })}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              {t("test.correctWrongLine", { correct: score, wrong })}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              {t("test.accuracy", { percent })}
            </p>
          </div>

          <div className="mt-1 flex gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-4 py-1.5 font-semibold text-success">
              <Check className="size-4" /> {t("test.correctChip", { count: score })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-4 py-1.5 font-semibold text-destructive">
              <X className="size-4" /> {t("test.wrongChip", { count: wrong })}
            </span>
          </div>

          {showStreak && (
            <p className="mt-1 rounded-full bg-bee/20 px-4 py-1.5 text-sm font-bold">
              {t("streak.onStreak", { count: state.streak.currentStreak })}
            </p>
          )}
        </Card>

        {/* Newly mastered achievement */}
        {newlyMastered.length > 0 && (
          <div className="sbt-pop-in rounded-3xl border-2 border-bee/50 bg-bee/10 px-5 py-4">
            <p className="text-lg font-extrabold">{t("test.newMasterTitle")}</p>
            <p className="text-sm font-bold text-amber-600">
              {t("test.masteredTodayCount", { count: newlyMastered.length })}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {newlyMastered.map((word) => (
                <li key={word.id} className="flex items-center gap-2 font-semibold">
                  <span aria-hidden>⭐</span>
                  {word.word}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Words returned to Learning — calm, encouraging, no punishment */}
        {demoted.length > 0 && (
          <div className="rounded-2xl border border-grass/40 bg-grass/10 px-5 py-4">
            <p className="flex items-center gap-2 font-bold">
              <Sprout className="size-5 text-grass" />
              {t("test.practiceAgainTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("test.practiceAgainHint")}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {demoted.map((word) => (
                <li key={word.id} className="font-semibold">
                  {word.word}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions — hierarchy depends on whether wrong answers exist */}
        <div className="flex flex-col gap-2">
          {wrong > 0 && (
            <Button size="xl" onClick={retryWrong}>
              <RotateCcw /> {t("test.retryWrong")}
            </Button>
          )}
          <Button
            size={wrong > 0 ? "lg" : "xl"}
            variant={wrong > 0 ? "outline" : "default"}
            onClick={continueLearning}
          >
            <Play className={wrong > 0 ? "" : "fill-current"} />
            {t("test.continueLearning")}
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href={`/books/${book.id}`}>
              <LayoutDashboard /> {t("test.backToDashboard")}
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  // --- Active question -----------------------------------------------------

  const progress = (index / total) * 100;
  const heading = isRetry ? t("test.modeWrong") : t(MODE_LABEL_KEY[mode]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader title={heading} mascot backHref={`/books/${book.id}`} />

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
