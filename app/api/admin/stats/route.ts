import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// "Today" for the owner dashboard is a fixed application timezone (Asia/Seoul),
// so the daily metrics line up with the owner's local day regardless of where
// the server runs.
const ADMIN_TIMEZONE = "Asia/Seoul";
function seoulDateKey(d: Date): string {
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Admin-only aggregate stats. This is NOT a public endpoint:
 *  - it requires the caller's Supabase access token,
 *  - it verifies the token's email is in the admin allow-list server-side,
 *  - only then does it use the service-role key (server-only) to read counts.
 * RLS on the tables is unchanged; the service role is what reads across users,
 * and it never leaves the server.
 */
export async function GET(request: Request) {
  if (!url || !anonKey) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  // 1. Authenticate the caller from their bearer token.
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : "";
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const authClient = createClient(url, anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(
    token
  );
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Authorize: must be an admin.
  if (!isAdminEmail(userData.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 3. Aggregates require the service role (server-only). Report clearly if unset.
  if (!serviceKey) {
    return NextResponse.json({ configured: false });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Collect DB errors instead of silently showing 0 — a missing table, wrong
  // project, or permission problem would otherwise be invisible.
  const dbErrors: string[] = [];

  const count = async (table: string): Promise<number> => {
    const { count: c, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) dbErrors.push(`${table}: ${error.message}`);
    return c ?? 0;
  };

  // All auth users (email + signup) — paginated.
  const authUsers: { id: string; email: string | undefined; created_at: string }[] =
    [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) break;
    for (const u of data.users) {
      authUsers.push({ id: u.id, email: u.email, created_at: u.created_at });
    }
    if (data.users.length < 200) break;
  }

  // Aggregate sessions + words + per-user streak once, in memory (small,
  // admin-only dataset).
  const [sessionsRes, wordsRes, settingsRes, totalBooks] = await Promise.all([
    admin.from("test_sessions").select("user_id, created_at"),
    admin.from("words").select("user_id, mastered"),
    admin.from("settings").select("user_id, current_streak"),
    count("vocabulary_books"),
  ]);
  if (sessionsRes.error) dbErrors.push(`test_sessions: ${sessionsRes.error.message}`);
  if (wordsRes.error) dbErrors.push(`words: ${wordsRes.error.message}`);
  if (settingsRes.error) dbErrors.push(`settings: ${settingsRes.error.message}`);

  const streakByUser = new Map<string, number>();
  for (const r of (settingsRes.data ?? []) as {
    user_id: string;
    current_streak: number | null;
  }[]) {
    streakByUser.set(r.user_id, r.current_streak ?? 0);
  }

  const agg = new Map<
    string,
    { tests: number; mastered: number; total: number; lastActive: string | null }
  >();
  for (const u of authUsers) {
    agg.set(u.id, { tests: 0, mastered: 0, total: 0, lastActive: null });
  }

  // Daily metrics use the fixed application timezone.
  const today = seoulDateKey(new Date());
  let testsCompletedToday = 0;
  const activeUserIdsToday = new Set<string>();

  const sessionRows = (sessionsRes.data ?? []) as {
    user_id: string;
    created_at: string;
  }[];
  for (const s of sessionRows) {
    const e = agg.get(s.user_id);
    if (!e) continue;
    e.tests += 1;
    if (!e.lastActive || s.created_at > e.lastActive) e.lastActive = s.created_at;
    if (seoulDateKey(new Date(s.created_at)) === today) {
      testsCompletedToday += 1;
      activeUserIdsToday.add(s.user_id);
    }
  }
  const newUsersToday = authUsers.filter(
    (u) => seoulDateKey(new Date(u.created_at)) === today
  ).length;
  let totalWords = 0;
  for (const w of (wordsRes.data ?? []) as {
    user_id: string;
    mastered: boolean;
  }[]) {
    totalWords += 1;
    const e = agg.get(w.user_id);
    if (!e) continue;
    e.total += 1;
    if (w.mastered) e.mastered += 1;
  }

  const users = authUsers
    .map((u) => {
      const e = agg.get(u.id)!;
      return {
        email: u.email ?? "",
        signupDate: u.created_at,
        lastActive: e.lastActive,
        completedTests: e.tests,
        mastered: e.mastered,
        totalWords: e.total,
        currentStreak: streakByUser.get(u.id) ?? 0,
      };
    })
    // Sort by last active, most recent first; users with no activity last.
    .sort((a, b) => {
      const av = a.lastActive ?? "";
      const bv = b.lastActive ?? "";
      return bv < av ? -1 : bv > av ? 1 : 0;
    });

  return NextResponse.json({
    configured: true,
    timezone: ADMIN_TIMEZONE,
    totalUsers: authUsers.length,
    totalBooks,
    totalWords,
    totalSessions: sessionRows.length,
    newUsersToday,
    activeUsersToday: activeUserIdsToday.size,
    testsCompletedToday,
    users,
    // Non-empty when a DB read failed — surfaced on the dashboard so an
    // all-zero screen isn't mistaken for "no data" when it's really a
    // missing table / wrong project / permission issue.
    dbErrors,
  });
}
