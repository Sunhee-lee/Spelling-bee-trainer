-- ---------------------------------------------------------------------------
-- 0006 — Ensure test-history tables, indexes, and RLS policies exist.
--
-- These objects were introduced in 0001/0002, but this migration re-creates
-- them idempotently so a project that was set up without them (or with an
-- older/partial initial schema) gets a working statistics feature. Safe to run
-- multiple times.
-- ---------------------------------------------------------------------------

-- Tables ---------------------------------------------------------------------
create table if not exists public.test_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  book_id    uuid not null references public.vocabulary_books (id) on delete cascade,
  score      integer not null,
  correct    integer not null,
  wrong      integer not null,
  created_at timestamptz not null default now()
);
create index if not exists test_sessions_user_id_idx
  on public.test_sessions (user_id);

create table if not exists public.test_answers (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions (id) on delete cascade,
  word_id    uuid not null references public.words (id) on delete cascade,
  correct    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists test_answers_session_id_idx
  on public.test_answers (session_id);

-- Row-level security ---------------------------------------------------------
alter table public.test_sessions enable row level security;
alter table public.test_answers  enable row level security;

-- test_sessions — owned via user_id.
drop policy if exists sessions_select on public.test_sessions;
create policy sessions_select on public.test_sessions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists sessions_insert on public.test_sessions;
create policy sessions_insert on public.test_sessions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists sessions_update on public.test_sessions;
create policy sessions_update on public.test_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sessions_delete on public.test_sessions;
create policy sessions_delete on public.test_sessions
  for delete to authenticated using (user_id = auth.uid());

-- test_answers — ownership enforced through the parent test_sessions row.
drop policy if exists answers_select on public.test_answers;
create policy answers_select on public.test_answers
  for select to authenticated
  using (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

drop policy if exists answers_insert on public.test_answers;
create policy answers_insert on public.test_answers
  for insert to authenticated
  with check (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

drop policy if exists answers_update on public.test_answers;
create policy answers_update on public.test_answers
  for update to authenticated
  using (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

drop policy if exists answers_delete on public.test_answers;
create policy answers_delete on public.test_answers
  for delete to authenticated
  using (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

-- Table privileges for the PostgREST `authenticated` role (RLS still restricts
-- rows to their owner). Without these, history writes fail with 42501.
grant select, insert, update, delete
  on public.test_sessions, public.test_answers to authenticated;
