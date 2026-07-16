-- Spelling Bee Trainer — initial schema
-- Normalized tables for cloud sync. Run this in the Supabase SQL editor
-- (or via the Supabase CLI) before 0002_rls_policies.sql.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  display_name text
);

-- ---------------------------------------------------------------------------
-- vocabulary_books
--   unlock_after_book_id / built_in are required by the app model:
--   they drive the Supplemental List unlock and protect the seed books.
-- ---------------------------------------------------------------------------
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
create index if not exists vocabulary_books_user_id_idx
  on public.vocabulary_books (user_id);

-- ---------------------------------------------------------------------------
-- words
-- ---------------------------------------------------------------------------
create table if not exists public.words (
  id                  uuid primary key default gen_random_uuid(),
  book_id             uuid not null references public.vocabulary_books (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  number              integer not null,
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

-- ---------------------------------------------------------------------------
-- settings (one row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  questions_per_test integer not null default 20,
  master_review_rate real    not null default 0.1,
  shuffle_questions  boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- test_sessions / test_answers (test history)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Auto-create a profile + settings row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
