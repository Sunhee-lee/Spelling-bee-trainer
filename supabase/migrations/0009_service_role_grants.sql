-- ---------------------------------------------------------------------------
-- 0009 — Grant table access to the `service_role` (and reaffirm `authenticated`).
--
-- Symptom this fixes: the Admin dashboard shows all zeros and its API reports
-- "permission denied for table words / settings / test_sessions" (Postgres
-- error 42501). The admin reads across users with the SERVICE ROLE, but tables
-- created via raw SQL don't automatically grant that role table privileges, so
-- every admin read is denied — even though the app itself (the `authenticated`
-- role, granted in 0007) writes and reads fine.
--
-- This grants the service role full access, reaffirms the authenticated grants,
-- and sets default privileges so future tables are covered too. RLS is
-- unchanged; the service role legitimately reads across users for the owner-only
-- admin dashboard. Idempotent and safe to re-run.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

-- Service role (admin dashboard): full access to every table + sequence.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- App users: reaffirm read/write on every table (RLS still scopes rows).
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Cover any tables added later without needing another grant migration.
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
