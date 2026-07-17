"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Search, X } from "lucide-react";

import { useBookId } from "@/lib/useBookId";
import { useAppState } from "@/store/useVocabStore";
import { useLearnSession } from "@/lib/useLearnSession";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Flashcard } from "@/components/learn/Flashcard";
import { LearnComplete } from "@/components/learn/LearnComplete";
import { LearnControls } from "@/components/learn/LearnControls";
import { LearnProgress } from "@/components/learn/LearnProgress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** True for a focused clickable control (button/link) whose own Space/Enter wins. */
function isClickableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest("button,a");
}

/** True for an editable field, where arrow keys move the caret, not cards. */
function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest("input,textarea,select");
}

export default function LearnPage() {
  const bookId = useBookId();
  const router = useRouter();
  const { state, hydrated } = useAppState();
  const { t } = useTranslation();

  const book = state.books.find((b) => b.id === bookId);

  // Study order is by word number (§6). Memoized so its identity is stable.
  const words = useMemo(
    () => (book ? [...book.words].sort((a, b) => a.number - b.number) : []),
    [book]
  );

  const session = useLearnSession(bookId, words, hydrated && !!book);
  const { phase, flip, next, prev } = session;

  const exitHref = `/books/${bookId}`;

  // Global keyboard navigation: ←/→ move, Space/Enter flip, Escape exits.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.push(exitHref);
        return;
      }
      if (phase !== "card") return;
      switch (e.key) {
        // Arrow keys navigate from anywhere except a text field (buttons don't
        // use them, so a focused control never swallows them).
        case "ArrowLeft":
          if (isEditableTarget(e.target)) return;
          e.preventDefault();
          prev();
          break;
        case "ArrowRight":
          if (isEditableTarget(e.target)) return;
          e.preventDefault();
          next();
          break;
        // Space/Enter flip — but let a focused button/link activate itself.
        case " ":
        case "Spacebar":
        case "Enter":
          if (isClickableTarget(e.target)) return;
          e.preventDefault();
          flip();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, flip, next, prev, router, exitHref]);

  // Horizontal swipe navigation on touch devices.
  const touchStartX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) < 50) return; // a tap, not a swipe — let the flip handle it
    if (dx < 0) next();
    else prev();
  }

  // --- Loading / guards ----------------------------------------------------

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
        <Card className="h-72 animate-pulse bg-muted/60" />
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
        <EmptyState icon={<Search />} title={t("common.bookNotFound")}>
          <Button asChild>
            <Link href="/">{t("common.backToBooks")}</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  if (words.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <AppHeader title={book.name} backHref={exitHref} />
        <EmptyState
          icon={<BookOpen />}
          title={t("learn.noWordsTitle")}
          description={t("learn.noWordsDesc")}
        >
          <Button asChild>
            <Link href={`/books/${book.id}/words`}>
              <Plus /> {t("book.addWords")}
            </Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  // --- Complete screen -----------------------------------------------------

  if (phase === "complete") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <AppHeader title={book.name} backHref={exitHref} />
        <LearnComplete
          book={book}
          total={session.total}
          onReviewAgain={session.reviewAgain}
        />
      </main>
    );
  }

  // --- Active card ---------------------------------------------------------

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={book.name}
        backHref={exitHref}
        subtitle={t("learn.title")}
        action={
          <Link
            href={exitHref}
            aria-label={t("common.close")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            <X className="size-5" />
          </Link>
        }
      />

      <LearnProgress current={session.index + 1} total={session.total} />

      {session.current && (
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <Flashcard
            word={session.current}
            flipped={session.flipped}
            index={session.index}
            total={session.total}
            onFlip={flip}
          />
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {t("learn.swipeHint")}
      </p>

      <LearnControls
        onPrev={prev}
        onFlip={flip}
        onNext={next}
        isFirst={session.isFirst}
        isLast={session.isLast}
      />
    </main>
  );
}
