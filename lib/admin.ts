/**
 * Administrator allow-list. Only these emails may access `/admin`.
 * A simple constant for now — replace/extend as needed.
 *
 * Note: this is a client-visible convenience for hiding UI. The real
 * enforcement is server-side in the admin API route (which re-checks the
 * caller's verified email), plus RLS, which never exposes other users' data.
 */
export const ADMIN_EMAILS: readonly string[] = ["sunhee1116@hanmail.net"];

/** Case-insensitive membership check. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}
