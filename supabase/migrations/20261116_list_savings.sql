-- ShopWyse admin page: record each saved list's "Estimated Money Saved" when it's saved.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Lists saved before this are priced at today's prices on the admin page.

alter table public.saved_grocery_lists add column if not exists estimated_savings numeric;
