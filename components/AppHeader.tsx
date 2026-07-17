"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Mascot } from "@/components/Mascot";

interface AppHeaderProps {
  title: string;
  emoji?: string;
  /** Show the app mascot instead of an emoji (the brand character). */
  mascot?: boolean;
  subtitle?: string;
  /** When set, shows a back button linking here. */
  backHref?: string;
  /** Optional element rendered on the right (e.g. a settings link). */
  action?: React.ReactNode;
  className?: string;
}

/** Consistent, friendly page header with an optional back button. */
export function AppHeader({
  title,
  emoji,
  mascot,
  subtitle,
  backHref,
  action,
  className,
}: AppHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className={cn("flex items-center gap-3", className)}>
      {backHref && (
        <Link
          href={backHref}
          aria-label={t("common.back")}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/40 outline-none"
        >
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {mascot ? (
            <Mascot className="size-8 sm:size-9" />
          ) : (
            emoji && <span aria-hidden>{emoji}</span>
          )}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
