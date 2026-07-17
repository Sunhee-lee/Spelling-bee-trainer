# Supabase Setup

Cloud sync uses Supabase for **email + password** auth and a private,
per-user Postgres database. The app works **offline (LocalStorage) when signed
out** and syncs to the cloud when signed in.

Everything below is manual dashboard/SQL work — it takes about five minutes.
The application code is already wired up.

Project used by this repo:

- **URL:** `https://ahntsnjuvfrvdkjrihbt.supabase.co`
- **Publishable (anon) key:** `sb_publishable_cET-uUWARWp4d9gCUjh4Kg_xgYYBxfi`

---

## 1. Environment variables

Create `.env.local` at the repo root (already present in this repo; not
committed). Both values are safe to expose to the browser.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ahntsnjuvfrvdkjrihbt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cET-uUWARWp4d9gCUjh4Kg_xgYYBxfi
```

> Never put the **service role** key in the frontend or in `NEXT_PUBLIC_*`.
> The app only ever uses the publishable/anon key.

### Optional: admin dashboard (`/admin`)

The admin dashboard is gated to the emails listed in `lib/admin.ts`
(`ADMIN_EMAILS`). Its aggregate counts (total users / books / words / tests)
are read by a **server-only** route (`app/api/admin/stats`) that (1) verifies
the caller's token belongs to an admin, then (2) uses the service-role key to
read across users. RLS is unchanged; the service role never reaches the
browser.

To enable the counts, set a **server-only** env var (no `NEXT_PUBLIC_`):

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # Supabase → Settings → API
```

Without it, `/admin` still loads for admins but shows a "not configured"
notice instead of numbers. Add the same variable in Vercel's project settings
(not exposed to the client) for production.

---

## 2. Run the SQL migrations

Supabase Dashboard → **SQL Editor** → **New query**. Run these files in
order (copy-paste their contents), or use the Supabase CLI.

1. `supabase/migrations/0001_initial_schema.sql` — tables, indexes, and the
   `handle_new_user` trigger (auto-creates a `profiles` + `settings` row on
   signup).
2. `supabase/migrations/0002_rls_policies.sql` — enables Row Level Security and
   the owner-only policies.
3. `supabase/migrations/0003_settings_language.sql` — adds the cloud-synced UI
   `language` column to `settings`.
4. `supabase/migrations/0004_settings_streak.sql` — adds the daily learning
   streak columns (`current_streak`, `longest_streak`, `last_study_date`) to
   `settings`. Existing rows are backfilled with safe defaults (0 / 0 / null),
   so no vocabulary progress is touched. RLS is unchanged.

With the CLI instead:

```bash
supabase link --project-ref ahntsnjuvfrvdkjrihbt
supabase db push          # applies files in supabase/migrations/
```

---

## 3. Enable Email + Password authentication

Dashboard → **Authentication → Sign In / Providers** (older UI:
**Authentication → Providers**).

- Ensure **Email** is **enabled**.
- Do **not** enable Google or Apple (out of scope).

---

## 4. Disable email confirmation (required)

So users can **Sign Up → immediately Sign In** without verifying email:

Dashboard → **Authentication → Sign In / Providers → Email** → turn **off**
**"Confirm email"** (older UI: **Authentication → Providers → Email →
"Confirm email" = off**). Save.

With confirmation off, `signUp` returns a session immediately and the app logs
the user straight in.

---

## 5. Password reset redirect URL

The app sends reset emails that link to `/reset-password`. Add your app origins
to the allow list:

Dashboard → **Authentication → URL Configuration**:

- **Site URL:** your production URL (e.g. `https://your-app.vercel.app`).
- **Redirect URLs:** add both
  - `http://localhost:3000/reset-password`
  - `https://your-app.vercel.app/reset-password`

---

## 6. Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel (framework auto-detected as
   Next.js).
2. Vercel → **Project → Settings → Environment Variables**, add for all
   environments:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Then update the Supabase **Site URL / Redirect URLs** (step 5) with
   the Vercel domain.

---

## 7. Verify

- **Sign Up** a new email/password → you should land in the app signed in
  (no email verification needed).
- **Log out** (Settings → Account & sync) → **Log in** again.
- **Forgot password** → email arrives → open the link → `/reset-password` →
  set a new password.
- **Cloud sync:** add words / take a test, then open the account on another
  device (or a private window) and log in → same data.
- **First-login migration:** use the app offline, add words, then log in for
  the first time → you'll be asked to **Upload existing progress** or **Start
  fresh**.
- **RLS:** with the anon key you can only read/write your own rows; another
  user's rows are invisible. (Confirm in the SQL editor by querying as
  different users, or via the API with two accounts.)

---

## How the app decides which backend to use

- **Signed out →** `LocalStorageRepository` (offline; data on the device).
- **Signed in →** `SupabaseRepository` (normalized tables, RLS-protected).

The UI only talks to the store, which talks to a `StorageRepository`. The
repository is swapped automatically on login/logout — no UI code touches
Supabase directly.
