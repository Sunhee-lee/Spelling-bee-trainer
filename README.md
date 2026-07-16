# Spelling Bee Trainer 🐝

A friendly spelling-practice web app for young learners. The teacher reads the
Korean meaning, the student says and spells the English word, and a grown-up
taps ⭕ or ❌. A test-based spaced-repetition system schedules reviews and
tracks mastery.

Built with Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, and
Lucide icons. The UI is fully bilingual — **Korean (default)** and English,
switchable in Settings and synced with your account.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

The app works fully **offline** out of the box — all data is stored in the
browser's LocalStorage. No account is required.

## Cloud sync (optional)

Sign in with email + password to back up and sync your books, words, SRS
progress, master status, test history, settings, and Supplemental-unlock status
across devices via Supabase.

- Signed **out** → data lives on the device (LocalStorage).
- Signed **in** → data syncs to Supabase (private, per-user, RLS-protected).

To enable it you need a Supabase project and a few dashboard steps (create the
tables, enable email auth, disable email confirmation). See
**[`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)** — it takes about five
minutes. Environment variables go in `.env.local` (see `.env.example`).

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build (also type-checks)
npm run start    # serve the production build
npm run lint     # ESLint
```

## Architecture

- `types/` — domain model (`Word`, `Book`, `AppState`, …)
- `services/` — SRS grading, test builders, stats, vocab import/export
- `storage/` — `StorageRepository` interface + `LocalStorageRepository` and
  `SupabaseRepository` implementations, plus schema migration
- `store/` — reactive store (`useSyncExternalStore`) with a swappable backend
- `auth/` — Supabase `AuthProvider` (session + repository switching)
- `locales/` — `ko.ts` / `en.ts` translations; `lib/i18n.ts` — `useTranslation`
- `lib/admin.ts` — admin allow-list; `app/admin` + `app/api/admin/stats` —
  admin-only dashboard (server-verified, service-role reads)
- `components/`, `app/` — UI (App Router)
- `supabase/migrations/` — SQL schema + RLS policies

The UI only talks to the store; the store talks to a `StorageRepository`. The
repository is swapped automatically on login/logout, so no UI code touches
Supabase directly.
