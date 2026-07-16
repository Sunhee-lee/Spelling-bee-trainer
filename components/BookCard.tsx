import Link from "next/link";
import { BookOpen, GraduationCap, Lock, Play, RefreshCw, Trophy } from "lucide-react";

import type { Book } from "@/types";
import { computeBookStats } from "@/services/stats";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const ACCENTS = {
  bee: { bar: "bg-bee", ring: "text-bee" },
  grass: { bar: "bg-grass", ring: "text-grass" },
  sky: { bar: "bg-sky", ring: "text-sky" },
  berry: { bar: "bg-berry", ring: "text-berry" },
} as const;

export type BookAccent = keyof typeof ACCENTS;

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

function StatChip({ icon, label, value }: StatChipProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl bg-muted/70 px-2 py-2.5">
      <div className="flex items-center gap-1 text-muted-foreground [&>svg]:size-4">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-lg font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

interface BookCardProps {
  book: Book;
  accent?: BookAccent;
}

export function BookCard({ book, accent = "bee" }: BookCardProps) {
  const stats = computeBookStats(book);
  const colors = ACCENTS[accent];
  const isEmpty = stats.total === 0;
  const canTest = !book.locked && !isEmpty;

  return (
    <Card className="gap-4 overflow-hidden">
      <div className={cn("h-2 w-full", colors.bar)} />

      <div className="flex flex-col gap-4 px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold">{book.name}</h2>
            <p className="text-sm text-muted-foreground">
              {stats.total} {stats.total === 1 ? "word" : "words"}
            </p>
          </div>
          {book.locked ? (
            <Badge variant="muted" className="gap-1">
              <Lock className="size-3.5" /> Locked
            </Badge>
          ) : (
            <Badge variant="success" className="gap-1">
              <Trophy className="size-3.5" /> {stats.progress}%
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-muted-foreground">Mastered</span>
            <span className="tabular-nums">
              {stats.mastered} / {stats.total}
            </span>
          </div>
          <Progress value={stats.progress} indicatorClassName={colors.bar} />
        </div>

        <div className="flex gap-2">
          <StatChip
            icon={<Trophy />}
            label="Master"
            value={stats.mastered}
          />
          <StatChip
            icon={<GraduationCap />}
            label="Learning"
            value={stats.learning}
          />
          <StatChip icon={<RefreshCw />} label="Review" value={stats.review} />
        </div>

        {book.locked && (
          <p className="rounded-2xl bg-muted/70 px-4 py-2.5 text-center text-sm text-muted-foreground">
            🔒 Master all of Basic 100 to unlock.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {canTest ? (
            <Button asChild size="lg" className="flex-1">
              <Link href={`/books/${book.id}/test`}>
                <Play className="fill-current" /> Start Test
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1"
              disabled
              title={
                book.locked ? "This book is locked" : "Add words to start a test"
              }
            >
              <Play className="fill-current" /> Start Test
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="flex-1">
            <Link href={`/books/${book.id}`}>
              <BookOpen /> Manage
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
