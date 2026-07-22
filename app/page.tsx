"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Lock,
  LockOpen,
  Settings,
  Trophy,
} from "lucide-react";

import type { Book } from "@/types";
import { useAppState } from "@/store/useVocabStore";
import { computeBookStats, isBookComplete } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { ExitOnBack } from "@/components/ExitOnBack";
import { InstallButton } from "@/components/InstallButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** A tappable book row on the home screen — opens the book's page. */
function BookRow({ book, prerequisite }: { book: Book; prerequisite?: Book }) {
  const { t } = useTranslation();
  const stats = computeBookStats(book);
  const LockIcon = book.locked ? Lock : LockOpen;

  return (
    <Link href={`/books/${book.id}`} className="block">
      <Card className="py-4 transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3">
          {/* Lock in front of the name: open when unlocked, closed when locked. */}
          <LockIcon
            className={`size-5 shrink-0 ${book.locked ? "text-muted-foreground" : "text-bee"}`}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-lg font-bold">{book.name}</p>
            {book.locked ? (
              <p className="text-sm text-muted-foreground">
                {t("book.lockedTitle", {
                  prereq: prerequisite?.name ?? "Basic 100",
                })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("progress.master")} {stats.mastered} / {stats.total} ·{" "}
                {stats.progress}%
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
  const { t } = useTranslation();

  const primary = state.books[0];

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
      <ExitOnBack />
      <AppHeader
        title={t("common.appName")}
        mascot
        subtitle={t("home.subtitle")}
        action={
          <div className="flex items-center gap-2">
            <InstallButton />
            <Button asChild variant="outline" size="icon" aria-label={t("common.settings")}>
              <Link href="/settings">
                <Settings />
              </Link>
            </Button>
          </div>
        }
      />

      {!hydrated ? (
        <Card className="h-96 animate-pulse bg-muted/60" />
      ) : (
        <>
          {unlocked && (
            <div className="flex items-center gap-3 rounded-3xl border-2 border-success/40 bg-success/10 px-5 py-4">
              <Trophy className="size-8 shrink-0 text-bee" aria-hidden />
              <p className="text-sm font-semibold sm:text-base">
                {t("home.unlockedBanner", {
                  prereq: prerequisiteOf(unlocked)?.name ?? "",
                  book: unlocked.name,
                })}
              </p>
            </div>
          )}

          {/* Book selector — tap a book to enter it. */}
          <section className="flex flex-col gap-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("home.books")}
            </h2>
            {state.books.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                prerequisite={prerequisiteOf(book)}
              />
            ))}
          </section>

          {/* Quick links pinned to the bottom of the home screen. */}
          {primary && (
            <div className="mt-1 flex flex-col gap-1 border-t border-border pt-5">
              <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
                <Link href={`/books/${primary.id}/master`}>
                  <Trophy /> {t("master.title")}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
                <Link href={`/statistics?book=${primary.id}`}>
                  <BarChart3 /> {t("stats.link")}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="self-center text-muted-foreground">
                <Link href={`/books/${primary.id}/words`}>
                  <BookOpen /> {t("book.manageWords")}
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
