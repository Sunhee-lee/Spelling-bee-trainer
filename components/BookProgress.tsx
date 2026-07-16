import { GraduationCap, RefreshCw, Trophy } from "lucide-react";

import type { Book } from "@/types";
import { computeBookStats } from "@/services/stats";
import { Progress } from "@/components/ui/progress";

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatTile({ icon, label, value }: StatTileProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl bg-muted/70 px-2 py-3">
      <div className="flex items-center gap-1 text-muted-foreground [&>svg]:size-4">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

/** Full-width progress summary for a book: bar + Master / Learning / Review. */
export function BookProgress({ book }: { book: Book }) {
  const stats = computeBookStats(book);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-muted-foreground">Mastered</span>
          <span className="tabular-nums">
            {stats.mastered} / {stats.total} · {stats.progress}%
          </span>
        </div>
        <Progress value={stats.progress} indicatorClassName="bg-bee" />
      </div>

      <div className="flex gap-2">
        <StatTile icon={<Trophy />} label="Master" value={stats.mastered} />
        <StatTile
          icon={<GraduationCap />}
          label="Learning"
          value={stats.learning}
        />
        <StatTile icon={<RefreshCw />} label="Review" value={stats.review} />
      </div>
    </div>
  );
}
