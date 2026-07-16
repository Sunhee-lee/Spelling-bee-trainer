import { cn } from "@/lib/utils";

interface EmptyStateProps {
  emoji: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Friendly placeholder shown when a list has no items yet. */
export function EmptyState({
  emoji,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card/60 px-6 py-12 text-center",
        className
      )}
    >
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && (
        <p className="max-w-sm whitespace-pre-line text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
