"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Ban,
  BookOpen,
  CalendarCheck,
  Flame,
  RefreshCw,
  ShieldCheck,
  Type,
  UserPlus,
  Users,
} from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { isAdminEmail } from "@/lib/admin";
import { getSupabase } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AdminUser {
  email: string;
  signupDate: string;
  lastActive: string | null;
  completedTests: number;
  mastered: number;
  totalWords: number;
  currentStreak: number;
}

interface Stats {
  configured: boolean;
  timezone?: string;
  totalUsers?: number;
  totalBooks?: number;
  totalWords?: number;
  totalSessions?: number;
  newUsersToday?: number;
  activeUsersToday?: number;
  testsCompletedToday?: number;
  users?: AdminUser[];
  dbErrors?: string[];
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

  // Date helpers.
  const fmtDate = (iso: string) => iso.slice(0, 10);
  const fmtLastActive = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return sameDay ? `${t("admin.today")} ${hh}:${mm}` : fmtDate(iso);
  };

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
          icon={<Ban />}
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

  const users = stats?.users ?? [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <AppHeader
        title={t("admin.title")}
        icon={<ShieldCheck className="size-7 text-primary sm:size-8" />}
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
        <>
          {/* Surface DB read errors so an all-zero screen isn't mistaken for
              "no data" when it's really a missing table / wrong project. */}
          {stats.dbErrors && stats.dbErrors.length > 0 && (
            <Card className="border-2 border-destructive/40">
              <CardContent className="flex flex-col gap-1 py-4">
                <p className="text-sm font-bold text-destructive">
                  {t("admin.dbErrorTitle")}
                </p>
                {stats.dbErrors.map((e) => (
                  <p key={e} className="break-words font-mono text-xs text-destructive">
                    {e}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

          {/* Today's activity (Asia/Seoul boundary) */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("admin.todayHeading")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={<UserPlus />}
                label={t("admin.newUsersToday")}
                value={stats.newUsersToday ?? 0}
              />
              <StatCard
                icon={<Activity />}
                label={t("admin.activeUsersToday")}
                value={stats.activeUsersToday ?? 0}
              />
              <StatCard
                icon={<CalendarCheck />}
                label={t("admin.testsCompletedToday")}
                value={stats.testsCompletedToday ?? 0}
              />
            </div>
          </section>

          {/* User list */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">
              {t("admin.userAccounts")}{" "}
              <span className="text-muted-foreground">({users.length})</span>
            </h2>

            {users.length === 0 ? (
              <EmptyState icon={<Users />} title={t("admin.noUsers")} />
            ) : (
              <>
                {/* Desktop table */}
                <Card className="hidden overflow-hidden py-0 sm:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">{t("admin.email")}</th>
                          <th className="px-4 py-3">{t("admin.signupDate")}</th>
                          <th className="px-4 py-3">{t("admin.lastActive")}</th>
                          <th className="px-4 py-3 text-right">
                            {t("admin.completedTests")}
                          </th>
                          <th className="px-4 py-3 text-right">
                            {t("admin.masterProgress")}
                          </th>
                          <th className="px-4 py-3 text-right">
                            {t("admin.currentStreak")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {users.map((u) => (
                          <tr key={u.email}>
                            <td className="px-4 py-3 font-semibold">{u.email}</td>
                            <td className="px-4 py-3 tabular-nums text-muted-foreground">
                              {fmtDate(u.signupDate)}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-muted-foreground">
                              {fmtLastActive(u.lastActive)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {u.completedTests}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {u.mastered} / {u.totalWords}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {u.currentStreak > 0 ? (
                                <span className="inline-flex items-center justify-end gap-1">
                                  <Flame className="size-3.5 text-amber-500" />
                                  {u.currentStreak}
                                </span>
                              ) : (
                                u.currentStreak
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Mobile stacked cards */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {users.map((u) => (
                    <Card key={u.email}>
                      <CardContent className="flex flex-col gap-2 py-4">
                        <p className="truncate font-bold">{u.email}</p>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                          <dt className="text-muted-foreground">
                            {t("admin.signupDate")}
                          </dt>
                          <dd className="text-right tabular-nums">
                            {fmtDate(u.signupDate)}
                          </dd>
                          <dt className="text-muted-foreground">
                            {t("admin.lastActive")}
                          </dt>
                          <dd className="text-right tabular-nums">
                            {fmtLastActive(u.lastActive)}
                          </dd>
                          <dt className="text-muted-foreground">
                            {t("admin.completedTests")}
                          </dt>
                          <dd className="text-right tabular-nums">
                            {u.completedTests}
                          </dd>
                          <dt className="text-muted-foreground">
                            {t("admin.masterProgress")}
                          </dt>
                          <dd className="text-right tabular-nums">
                            {u.mastered} / {u.totalWords}
                          </dd>
                          <dt className="text-muted-foreground">
                            {t("admin.currentStreak")}
                          </dt>
                          <dd className="flex items-center justify-end gap-1 tabular-nums">
                            {u.currentStreak > 0 && (
                              <Flame className="size-3.5 text-amber-500" />
                            )}
                            {u.currentStreak}
                          </dd>
                        </dl>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      ) : (
        <Card className="h-32 animate-pulse bg-muted/60" />
      )}
    </main>
  );
}
