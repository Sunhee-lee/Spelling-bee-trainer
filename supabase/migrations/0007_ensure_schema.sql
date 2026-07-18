-- ---------------------------------------------------------------------------
-- 0007 — Ensure the full schema + RLS exist (idempotent, safe to re-run).
--
-- Run this in the Supabase SQL editor if cloud saves fail ("저장 실패" /
-- "Save failed"). It re-creates every table, the later-added settings columns,
-- and all Row-Level-Security policies so a project with a missing/partial
-- schema, or with RLS enabled but policies missing (which denies ALL writes),
-- becomes correct. It changes no existing data.
-- ---------------------------------------------------------------------------

-- Tables --------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  display_name text
);

create table if not exists public.vocabulary_books (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  name                 text not null,
  current_test         integer not null default 1,
  is_locked            boolean not null default false,
  unlock_after_book_id uuid references public.vocabulary_books (id) on delete set null,
  built_in             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists vocabulary_books_user_id_idx on public.vocabulary_books (user_id);

create table if not exists public.words (
  id                  uuid primary key default gen_random_uuid(),
  book_id             uuid not null references public.vocabulary_books (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  number              integer not null default 1,
  word                text not null,
  meaning             text not null,
  mastered            boolean not null default false,
  consecutive_correct integer not null default 0,
  level               integer not null default 0,
  next_review_test    integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists words_user_id_idx on public.words (user_id);
create index if not exists words_book_id_idx on public.words (book_id);

create table if not exists public.settings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  questions_per_test integer not null default 20,
  master_review_rate real    not null default 0.1,
  shuffle_questions  boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Columns added by later migrations (0003 language, 0004 streak).
alter table public.settings add column if not exists language        text not null default 'ko';
alter table public.settings add column if not exists current_streak  integer not null default 0;
alter table public.settings add column if not exists longest_streak  integer not null default 0;
alter table public.settings add column if not exists last_study_date date;

-- Row-level security ---------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.vocabulary_books enable row level security;
alter table public.words            enable row level security;
alter table public.settings         enable row level security;

-- Recreate every owner-scoped policy (drop-then-create = idempotent).
do $$
declare
  t text;
  owner_col text;
begin
  for t, owner_col in
    select * from (values
      ('profiles',         'id'),
      ('vocabulary_books', 'user_id'),
      ('words',            'user_id'),
      ('settings',         'user_id')
    ) as x(tbl, col)
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    execute format(
      'create policy %I_select on public.%I for select to authenticated using (%I = auth.uid())',
      t, t, owner_col);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (%I = auth.uid())',
      t, t, owner_col);
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (%I = auth.uid()) with check (%I = auth.uid())',
      t, t, owner_col, owner_col);
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (%I = auth.uid())',
      t, t, owner_col);
  end loop;
end $$;

-- Table privileges ----------------------------------------------------------
-- PostgREST connects signed-in users as the `authenticated` role, which needs
-- table-level GRANTs *in addition to* RLS. Tables created via raw SQL don't get
-- these automatically, which causes "permission denied for table ..." (42501)
-- even when the RLS policies are correct. Grant broadly; RLS still restricts
-- each row to its owner.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.vocabulary_books,
  public.words,
  public.settings
  to authenticated;

-- Test-history tables + policies live in 0006_ensure_test_history.sql.
