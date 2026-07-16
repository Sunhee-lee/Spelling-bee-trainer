import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centered, mobile-first shell for the authentication screens. */
export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Link href="/" className="text-4xl" aria-label="Home">
          🐝
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
      {footer && (
        <div className="text-center text-sm text-muted-foreground">{footer}</div>
      )}
    </main>
  );
}
