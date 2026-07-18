-- ---------------------------------------------------------------------------
-- 0008 — lesson_progress: per-lesson completion timestamps for the Basic 100
-- lesson flow, so a signed-in learner keeps the same lesson unlock state on
-- every device / browser / fresh install.
--
-- Deliberately minimal: only the two completion timestamps are stored (the
-- Not Started / Learning / Ready for Test / Completed status is *derived* from
-- them, never stored). Idempotent and safe to re-run.
-- ---------------------------------------------------------------------------

create table if not exists public.lesson_progress (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  book_id            uuid not null references public.vocabulary_books (id) on delete cascade,
  lesson_number      integer not null,
  learn_completed_at timestamptz,
  test_completed_at  timestamptz,
  updated_at         timestamptz not null default now(),
  -- One row per lesson per book per user; upserts key on this.
  unique (user_id, book_id, lesson_number)
);
create index if not exists lesson_progress_user_id_idx
  on public.lesson_progress (user_id);

-- Row-level security — owned via user_id.
alter table public.lesson_progress enable row level security;

drop policy if exists lesson_progress_select on public.lesson_progress;
create policy lesson_progress_select on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists lesson_progress_insert on public.lesson_progress;
create policy lesson_progress_insert on public.lesson_progress
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists lesson_progress_update on public.lesson_progress;
create policy lesson_progress_update on public.lesson_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lesson_progress_delete on public.lesson_progress;
create policy lesson_progress_delete on public.lesson_progress
  for delete to authenticated using (user_id = auth.uid());

-- Table privileges for the PostgREST `authenticated` role (RLS still restricts
-- rows to their owner). Without these, writes fail with 42501.
grant select, insert, update, delete on public.lesson_progress to authenticated;
