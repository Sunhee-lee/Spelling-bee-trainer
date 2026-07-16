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

  const [totalUsers, totalBooks, totalWords, totalSessions] = await Promise.all([
    count("profiles"),
    count("vocabulary_books"),
    count("words"),
    count("test_sessions"),
  ]);

  return NextResponse.json({
    configured: true,
    totalUsers,
    totalBooks,
    totalWords,
    totalSessions,
  });
}
