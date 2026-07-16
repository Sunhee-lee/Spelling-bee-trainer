-- Spelling Bee Trainer — Row Level Security
-- Run AFTER 0001_initial_schema.sql. Every application table is private:
-- only the authenticated owner (auth.uid()) can read or write their rows.
-- Anonymous access is denied everywhere (no public policies).

-- Enable RLS (deny-by-default once enabled).
alter table public.profiles         enable row level security;
alter table public.vocabulary_books enable row level security;
alter table public.words            enable row level security;
alter table public.settings         enable row level security;
alter table public.test_sessions    enable row level security;
alter table public.test_answers     enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — keyed by id = auth.uid()
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete on public.profiles
  for delete to authenticated using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- vocabulary_books — owned via user_id
-- ---------------------------------------------------------------------------
create policy books_select on public.vocabulary_books
  for select to authenticated using (user_id = auth.uid());
create policy books_insert on public.vocabulary_books
  for insert to authenticated with check (user_id = auth.uid());
create policy books_update on public.vocabulary_books
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy books_delete on public.vocabulary_books
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- words — owned via user_id
-- ---------------------------------------------------------------------------
create policy words_select on public.words
  for select to authenticated using (user_id = auth.uid());
create policy words_insert on public.words
  for insert to authenticated with check (user_id = auth.uid());
create policy words_update on public.words
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy words_delete on public.words
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- settings — owned via user_id
-- ---------------------------------------------------------------------------
create policy settings_select on public.settings
  for select to authenticated using (user_id = auth.uid());
create policy settings_insert on public.settings
  for insert to authenticated with check (user_id = auth.uid());
create policy settings_update on public.settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy settings_delete on public.settings
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- test_sessions — owned via user_id
-- ---------------------------------------------------------------------------
create policy sessions_select on public.test_sessions
  for select to authenticated using (user_id = auth.uid());
create policy sessions_insert on public.test_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy sessions_update on public.test_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sessions_delete on public.test_sessions
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- test_answers — no user_id column; ownership is enforced through the
-- parent test_sessions row.
-- ---------------------------------------------------------------------------
create policy answers_select on public.test_answers
  for select to authenticated
  using (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));
create policy answers_insert on public.test_answers
  for insert to authenticated
  with check (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));
create policy answers_update on public.test_answers
  for update to authenticated
  using (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));
create policy answers_delete on public.test_answers
  for delete to authenticated
  using (exists (
    select 1 from public.test_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));
