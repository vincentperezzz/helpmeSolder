-- Anonymous daily unique counting (visitors and guide creators).
-- One row per distinct client per UTC day per kind. client_hash is a one-way
-- hash that changes every day, so rows cannot be linked across days. No IP
-- address and no user agent are stored. Idempotent.

create table if not exists public.daily_clients (
  day date not null,
  kind text not null check (kind in ('visitor', 'creator')),
  client_hash text not null,
  primary key (day, kind, client_hash)
);

comment on table public.daily_clients is
  'Anonymous daily uniques. One row per client per day per kind; the hash is salted per day so it cannot follow a person across days. Purged after 90 days by the cleanup cron.';
comment on column public.daily_clients.day is 'UTC calendar day of the visit.';
comment on column public.daily_clients.kind is 'visitor = opened the site or a guide; creator = created a guide.';
comment on column public.daily_clients.client_hash is 'Truncated sha256 of a per-day HMAC key plus IP and user agent. Not reversible, not stable across days.';

create index if not exists daily_clients_kind_day_idx
  on public.daily_clients (kind, day);

alter table public.daily_clients enable row level security;
revoke all on public.daily_clients from anon, authenticated;
