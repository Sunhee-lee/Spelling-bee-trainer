"use client";

import Link from "next/link";
import { ChevronRight, Lock, LockOpen, Settings, Trophy } from "lucide-react";

import type { Book } from "@/types";
import { useAppState } from "@/store/useVocabStore";
import { computeBookStats, isBookComplete } from "@/services/stats";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BookQuickLinks } from "@/components/BookQuickLinks";
import { ExitOnBack } from "@/components/ExitOnBack";
import { InstallButton } from "@/components/InstallButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Cover colors cycled across unlocked books so each looks like a
 * different-colored notebook (spine band + soft cover tint). */
const COVERS = [
  { bar: "bg-bee", tint: "bg-bee/15" },
  { bar: "bg-grass", tint: "bg-grass/15" },
  { bar: "bg-sky", tint: "bg-sky/15" },
  { bar: "bg-berry", tint: "bg-berry/15" },
  { bar: "bg-grape", tint: "bg-grape/15" },
];

/** The paper fore-edge on the right of a closed book. */
const PAGE_EDGE = {
  backgroundImage:
    "repeating-linear-gradient(to right, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px)",
};

/** A tappable book on the home screen — styled like a spiral mini notebook. */
function BookRow({
  book,
  index,
  prerequisite,
}: {
  book: Book;
  index: number;
  prerequisite?: Book;
}) {
  const { t } = useTranslation();
  const stats = computeBookStats(book);
  const LockIcon = book.locked ? Lock : LockOpen;
  const cover = book.locked
    ? { bar: "bg-muted-foreground/40", tint: "bg-muted/60" }
    : COVERS[index % COVERS.length];

  return (
    <Link href={`/books/${book.id}`} className="block">
      <div
        className={`group relative h-32 overflow-hidden rounded-lg border border-border shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md ${cover.tint}`}
      >
        {/* Colored spine with binding holes punched down the bound edge. */}
        <div
          className={`absolute inset-y-0 left-0 flex w-5 flex-col items-center justify-around py-4 ${cover.bar}`}
          aria-hidden
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="size-1.5 rounded-full bg-background/75" />
          ))}
        </div>

        {/* Cover face. */}
        <div className="flex h-full items-center gap-3 pl-9 pr-4">
          <LockIcon
            className={`size-5 shrink-0 ${book.locked ? "text-muted-foreground" : "text-foreground/70"}`}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-xl font-bold">{book.name}</p>
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
        </div>

        {/* Paper fore-edge on the right. */}
        <div className="absolute inset-y-0 right-0 w-2" style={PAGE_EDGE} />
      </div>
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
            {state.books.map((book, index) => (
              <BookRow
                key={book.id}
                book={book}
                index={index}
                prerequisite={prerequisiteOf(book)}
              />
            ))}
          </section>

          {/* Quick links pinned to the bottom of the home screen. */}
          {primary && <BookQuickLinks bookId={primary.id} />}
        </>
      )}
    </main>
  );
}
