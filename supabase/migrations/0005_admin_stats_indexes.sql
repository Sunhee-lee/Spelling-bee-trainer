-- Spelling Bee Trainer — optional indexes for the admin dashboard queries.
-- Run AFTER 0004_settings_streak.sql. This migration is OPTIONAL: every Phase 4
-- metric is derived by aggregating existing rows, so no new columns or counters
-- are added and no data is changed. These indexes only speed up the admin
-- aggregate reads (sessions by user/date, mastered-word counts, streak dates).
-- All statements are idempotent and safe to re-run. RLS is unchanged.

create index if not exists test_sessions_created_at_idx
  on public.test_sessions (created_at);

-- test_sessions_user_id_idx already exists from 0001; this composite helps the
-- per-user "last active" and daily aggregation.
create index if not exists test_sessions_user_created_idx
  on public.test_sessions (user_id, created_at);

create index if not exists words_user_mastered_idx
  on public.words (user_id, mastered);

create index if not exists settings_last_study_date_idx
  on public.settings (last_study_date);
