"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, RefreshCw, ShieldCheck, Type, Users } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { isAdminEmail } from "@/lib/admin";
import { getSupabase } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  configured: boolean;
  totalUsers?: number;
  totalBooks?: number;
  totalWords?: number;
  totalSessions?: number;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-5">
        <div className="flex items-center gap-2 text-muted-foreground [&>svg]:size-4">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wide">
            {label}
          </span>
        </div>
        <span className="text-3xl font-extrabold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, loading, configured } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAdmin = configured && isAdminEmail(user?.email);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/admin/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setStats((await res.json()) as Stats);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Card className="h-48 animate-pulse bg-muted/60" />
      </main>
    );
  }

  // 403 for anyone who is not an authenticated admin.
  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <EmptyState
          emoji="🚫"
          title={t("admin.forbiddenTitle")}
          description={t("admin.forbiddenDesc")}
        >
          <Button asChild>
            <Link href="/">{t("admin.goHome")}</Link>
          </Button>
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={t("admin.title")}
        emoji="🛡️"
        backHref="/settings"
        subtitle={t("admin.subtitle")}
        action={
          <Button
            variant="outline"
            size="icon"
            aria-label={t("admin.refresh")}
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw />
          </Button>
        }
      />

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {t("admin.loadError")}
          </CardContent>
        </Card>
      ) : stats && stats.configured === false ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            <ShieldCheck className="mb-2 size-5 text-primary" />
            {t("admin.notConfigured")}
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users />}
            label={t("admin.totalUsers")}
            value={stats.totalUsers ?? 0}
          />
          <StatCard
            icon={<BookOpen />}
            label={t("admin.totalBooks")}
            value={stats.totalBooks ?? 0}
          />
          <StatCard
            icon={<Type />}
            label={t("admin.totalWords")}
            value={stats.totalWords ?? 0}
          />
          <StatCard
            icon={<RefreshCw />}
            label={t("admin.totalSessions")}
            value={stats.totalSessions ?? 0}
          />
        </div>
      ) : (
        <Card className="h-32 animate-pulse bg-muted/60" />
      )}
    </main>
  );
}
