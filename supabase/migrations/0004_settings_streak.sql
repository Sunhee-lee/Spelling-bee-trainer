-- Spelling Bee Trainer — add the daily learning streak (Phase 3, cloud-synced).
-- Run AFTER 0003_settings_language.sql. RLS policies are unchanged (the streak
-- lives on the existing per-user `settings` row, already covered by its policy).
--
-- Existing rows are backfilled with safe defaults, so current users keep all of
-- their vocabulary progress and simply start the streak at 0 / never-studied.

alter table public.settings
  add column if not exists current_streak  integer not null default 0,
  add column if not exists longest_streak  integer not null default 0,
  add column if not exists last_study_date date;
