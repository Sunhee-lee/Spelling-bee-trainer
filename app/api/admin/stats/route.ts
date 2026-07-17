import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const count = async (table: string): Promise<number> => {
    const { count: c } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });
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

  // Aggregate sessions + words once, in memory (small, admin-only dataset).
  const [sessionsRes, wordsRes, totalBooks] = await Promise.all([
    admin.from("test_sessions").select("user_id, created_at"),
    admin.from("words").select("user_id, mastered"),
    count("vocabulary_books"),
  ]);

  const agg = new Map<
    string,
    { tests: number; mastered: number; total: number; lastActive: string | null }
  >();
  for (const u of authUsers) {
    agg.set(u.id, { tests: 0, mastered: 0, total: 0, lastActive: null });
  }
  for (const s of (sessionsRes.data ?? []) as {
    user_id: string;
    created_at: string;
  }[]) {
    const e = agg.get(s.user_id);
    if (!e) continue;
    e.tests += 1;
    if (!e.lastActive || s.created_at > e.lastActive) e.lastActive = s.created_at;
  }
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
    totalUsers: authUsers.length,
    totalBooks,
    totalWords,
    totalSessions: (sessionsRes.data ?? []).length,
    users,
  });
}
