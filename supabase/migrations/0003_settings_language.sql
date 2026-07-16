-- Spelling Bee Trainer — add UI language to settings (cloud-synced).
-- Run AFTER 0002_rls_policies.sql. RLS policies are unchanged.

alter table public.settings
  add column if not exists language text not null default 'ko';

-- Optional: constrain to supported languages.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'settings_language_check'
  ) then
    alter table public.settings
      add constraint settings_language_check check (language in ('ko', 'en'));
  end if;
end $$;
