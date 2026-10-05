-- Admin settings: holds the password hash for the /admin dashboard.
-- Single row (id = 1). Only the server (service role key) can read or write it.
-- Safe to run more than once.

create table if not exists public.admin_settings (
  id smallint primary key default 1 check (id = 1),
  password_hash text not null,
  password_changed_at timestamptz not null default now()
);

comment on table public.admin_settings is
  'Single-row settings for the /admin dashboard. Service role only; never exposed to anon or authenticated.';
comment on column public.admin_settings.password_hash is
  'scrypt hash in the form scrypt$N$r$p$saltB64$hashB64. Never the plain password.';
comment on column public.admin_settings.password_changed_at is
  'When the admin password was last changed.';

alter table public.admin_settings enable row level security;

revoke all on table public.admin_settings from anon, authenticated;

-- Recovery: if the password is lost, delete the row in the Supabase table
-- editor. The dashboard then falls back to ADMIN_PASSWORD, or to the default.
