-- ShopWyse admin page: who is an admin, and when each user last logged in.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.users add column if not exists last_login_at timestamptz;

-- First admin. Other admins are made from the admin page.
update public.users set is_admin = true where lower(email) = 'connorthilton@test.com';
