"use client";

import Link from "next/link";

import { useTranslation } from "@/lib/i18n";
import { Mascot } from "@/components/Mascot";
import { Card, CardContent } from "@/components/ui/card";

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centered, mobile-first shell for the authentication screens. */
export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  const { t } = useTranslation();
  const appName = t("common.appName");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex flex-col items-center gap-1"
          aria-label={appName}
        >
          <Mascot className="size-12" />
          <span className="text-sm font-extrabold tracking-wide text-muted-foreground">
            {appName}
          </span>
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Card>
        {/* Roomier input fields on the auth screens (taller than the app default). */}
        <CardContent className="flex flex-col gap-4 [&_input]:h-14">
          {children}
        </CardContent>
      </Card>
      {footer && (
        <div className="text-center text-sm text-muted-foreground">{footer}</div>
      )}
    </main>
  );
}
