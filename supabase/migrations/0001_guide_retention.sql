-- Guide retention: track when a guide was last opened or updated.
-- Safe to run more than once. The app keeps working before this is applied.
alter table public.guides
  add column if not exists last_accessed_at timestamptz not null default now();

create index if not exists guides_last_accessed_at_idx
  on public.guides (last_accessed_at);
