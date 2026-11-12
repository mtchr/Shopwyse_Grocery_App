-- ShopWyse admin page: who is an admin, and when each user last logged in.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.users add column if not exists last_login_at timestamptz;

-- The admin page lists users with the most recent login first
create index if not exists users_last_login_at_idx on public.users (last_login_at desc nulls last);

-- First admin. Other admins are made from the admin page.
update public.users set is_admin = true where lower(email) = 'connorthilton@test.com';
