-- ============================================================================
-- APPLY ONLY AFTER CONFIRMING SUPABASE_SERVICE_ROLE_KEY WORKS IN PRODUCTION.
-- ============================================================================
-- The server talks to Supabase with the service role key, which bypasses RLS.
-- This migration blocks the public anon/authenticated keys from touching
-- guides directly. If production is still using the anon key as a fallback,
-- the app will stop working the moment this runs.

-- To list existing policies first, run:
--   select policyname, roles, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public' and tablename = 'guides';

alter table public.guides enable row level security;

revoke all on table public.guides from anon;
revoke all on table public.guides from authenticated;

-- With RLS enabled and no permissive policies, anon/authenticated see no rows.
-- Drop any old permissive policies found by the query above:
--   drop policy "<policy name>" on public.guides;
