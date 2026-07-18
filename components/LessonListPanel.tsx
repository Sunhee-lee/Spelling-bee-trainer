"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Lock,
  Play,
  Plus,
  RotateCcw,
  Trophy,
} from "lucide-react";

import type { Book } from "@/types";
import {
  allLessonsCompleted,
  computeLessonViews,
  type LessonProgress,
  type LessonStatus,
  type LessonView,
} from "@/services/lessons";
import { readBookLessons, resetBookLessons } from "@/lib/lessonProgress";
import { deleteCloudBookLessons } from "@/lib/lessonSync";
import { useTranslation, type TKey } from "@/lib/i18n";
import { Celebration } from "@/components/Celebration";
import { HiveBeeIcon } from "@/components/HiveBeeIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_LABEL: Record<LessonStatus, TKey> = {
  notStarted: "lesson.statusNotStarted",
  learning: "lesson.statusLearning",
  readyForTest: "lesson.statusReadyForTest",
  completed: "lesson.statusCompleted",
};

function StatusBadge({ status, locked }: { status: LessonStatus; locked: boolean }) {
  const { t } = useTranslation();
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
        <Lock className="size-3.5" /> {t("lesson.statusLocked")}
      </span>
    );
  }
  const cls: Record<LessonStatus, string> = {
    notStarted: "bg-muted text-muted-foreground",
    learning: "bg-sky/20 text-foreground",
    readyForTest: "bg-bee/25 text-amber-700",
    completed: "bg-success/15 text-success",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls[status]}`}>
      {status === "completed" && <CheckCircle2 className="size-3.5" />}
      {t(STATUS_LABEL[status])}
    </span>
  );
}

function LessonCard({ book, view }: { book: Book; view: LessonView }) {
  const { t } = useTranslation();
  const { number, words, startNumber, endNumber, status, locked } = view;
  const lessonParam = number; // 1-based in the URL
  const testEnabled = status === "readyForTest" || status === "completed";

  return (
    <Card className={locked ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-extrabold">
              {t("lesson.title", { number })}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("lesson.wordsRange", { start: startNumber, end: endNumber })}
              {" · "}
              {t("lesson.wordCount", { count: words.length })}
            </span>
          </div>
          <StatusBadge status={status} locked={locked} />
        </div>

        {locked ? (
          <p className="text-sm text-muted-foreground">{t("lesson.lockedHint")}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/learn/${book.id}?lesson=${lessonParam}`}>
                  <GraduationCap /> {t("lesson.learn")}
                </Link>
              </Button>
              {testEnabled ? (
                <Button asChild className="w-full">
                  <Link href={`/books/${book.id}/test?mode=lesson&lesson=${lessonParam}`}>
                    <Play className="fill-current" /> {t("lesson.test")}
                  </Link>
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  <Play className="fill-current" /> {t("lesson.test")}
                </Button>
              )}
            </div>
            {!testEnabled && (
              <p className="text-xs text-muted-foreground">{t("lesson.completeToTest")}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The Basic 100 dashboard: a staged list of lessons (20 words each) that unlock
 * in order. Each lesson is Learned then Tested to complete; completing a lesson
 * opens the next. When every lesson is done, a celebration and whole-book review
 * actions appear. Lesson progress is read from LocalStorage and refreshed when
 * the learner returns to the screen.
 */
export function LessonListPanel({ book }: { book: Book }) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<Record<number, LessonProgress>>({});
  const [restartOpen, setRestartOpen] = useState(false);

  const refresh = useCallback(() => setProgress(readBookLessons(book.id)), [book.id]);
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const views = computeLessonViews(book, progress);

  // Empty book → encourage adding words rather than showing zero lessons.
  if (views.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <HiveBeeIcon className="size-28" />
          <p className="font-semibold">{t("book.noVocabAdded")}</p>
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {t("book.noVocabHint")}
          </p>
          <Button asChild size="lg" className="mt-1 w-full sm:w-auto">
            <Link href={`/books/${book.id}/words`}>
              <Plus /> {t("book.addWords")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const allDone = allLessonsCompleted(views);

  // Restart clears lesson progress ONLY — words, mastery, streak, statistics,
  // and test history are untouched. Afterwards only Lesson 1 is unlocked.
  function doRestart() {
    resetBookLessons(book.id);
    void deleteCloudBookLessons(book.id).catch(() => {}); // no-op when signed out
    refresh();
    setRestartOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {allDone && (
        <div className="relative">
          <Celebration intensity="calm" />
          <Card className="sbt-pop-in items-center gap-3 py-8 text-center">
            <HiveBeeIcon className="size-24" />
            <h2 className="text-xl font-extrabold">{t("lesson.allCompleteTitle")}</h2>
            <p className="text-sm font-semibold text-muted-foreground">
              {t("lesson.allCompleteDesc", { count: views.length })}
            </p>
            <div className="mt-2 flex w-full flex-col gap-2">
              <Button asChild size="lg">
                <Link href={`/books/${book.id}/test?mode=full`}>
                  <ClipboardCheck /> {t("lesson.testAll")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/learn/${book.id}`}>
                  <GraduationCap /> {t("lesson.reviewAll")}
                </Link>
              </Button>
              <div className="mt-1 flex flex-col items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setRestartOpen(true)}
                >
                  <RotateCcw /> {t("lesson.restart")}
                </Button>
                <p className="whitespace-pre-line text-center text-xs text-muted-foreground">
                  {t("lesson.restartDesc")}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lesson.restartDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {t("lesson.restartDialogBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doRestart}>
              {t("lesson.restartAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("lesson.sectionTitle")}
        </h2>
        <span className="text-xs text-muted-foreground">{t("lesson.intro")}</span>
      </div>

      {views.map((view) => (
        <LessonCard key={view.index} book={book} view={view} />
      ))}

      {/* Whole-book extras kept available, below the lesson flow. */}
      <div className="mt-1 flex flex-col gap-1 border-t border-border pt-4">
        <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
          <Link href={`/books/${book.id}/master`}>
            <Trophy /> {t("master.title")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
          <Link href={`/statistics?book=${book.id}`}>
            <BarChart3 /> {t("stats.link")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
          <Link href={`/books/${book.id}/words`}>
            <BookOpen /> {t("book.manageWords")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
