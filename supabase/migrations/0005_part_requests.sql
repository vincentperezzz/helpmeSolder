-- Parts the AI assistants wanted but the catalog does not have.
-- part_requests: one row per normalized part name. demand = number of distinct
-- client-days that asked; calls = raw number of asks. The admin triages rows
-- with status / mapped_catalog_id / admin_note.
-- part_request_hits: dedupe table (one row per part per day per anonymous
-- client hash, same one-way daily hash as daily_clients). No IP and no user
-- agent are stored. Purged after 180 days by the cleanup cron. Idempotent.

create table if not exists public.part_requests (
  key text primary key,
  display_name text not null,
  kind text,
  source text not null,
  demand int not null default 0,
  calls int not null default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  example_pins jsonb,
  note text,
  suggested_catalog_id text,
  status text not null default 'new'
    check (status in ('new', 'planned', 'building', 'shipped', 'rejected')),
  mapped_catalog_id text,
  admin_note text,
  updated_at timestamptz not null default now()
);

comment on table public.part_requests is
  'Parts an AI assistant asked for that are not in the catalog, one row per normalized name.';
comment on column public.part_requests.key is 'Normalized name: lowercase, no prefix, alphanumerics only, max 80 chars.';
comment on column public.part_requests.demand is 'Distinct client-days that asked for this part.';
comment on column public.part_requests.calls is 'Raw number of times it was asked for.';
comment on column public.part_requests.mapped_catalog_id is 'Admin alias: when set, the MCP add_part tool maps this name to this catalog id.';
comment on column public.part_requests.status is 'Admin triage: new, planned, building, shipped, rejected.';

create table if not exists public.part_request_hits (
  key text not null,
  day date not null,
  client_hash text not null,
  primary key (key, day, client_hash)
);

comment on table public.part_request_hits is
  'Dedupe of part requests per anonymous daily client hash. Purged after 180 days.';

create index if not exists part_requests_demand_idx
  on public.part_requests (demand desc, last_seen desc);

alter table public.part_requests enable row level security;
alter table public.part_request_hits enable row level security;
revoke all on public.part_requests from anon, authenticated;
revoke all on public.part_request_hits from anon, authenticated;

create or replace function public.record_part_request(
  p_key text,
  p_display_name text,
  p_kind text,
  p_source text,
  p_pins jsonb,
  p_note text,
  p_suggested text,
  p_client_hash text
) returns void
language plpgsql
security invoker
as $$
declare
  inserted int;
begin
  insert into public.part_requests as r
    (key, display_name, kind, source, calls, example_pins, note, suggested_catalog_id)
  values
    (p_key, p_display_name, p_kind, p_source, 1, p_pins, p_note, p_suggested)
  on conflict (key) do update set
    calls = r.calls + 1,
    last_seen = now(),
    updated_at = now(),
    display_name = excluded.display_name,
    kind = coalesce(excluded.kind, r.kind),
    example_pins = coalesce(excluded.example_pins, r.example_pins),
    note = coalesce(excluded.note, r.note),
    suggested_catalog_id = coalesce(excluded.suggested_catalog_id, r.suggested_catalog_id);

  insert into public.part_request_hits (key, day, client_hash)
  values (p_key, current_date, p_client_hash)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted > 0 then
    update public.part_requests set demand = demand + 1 where key = p_key;
  end if;
end;
$$;

comment on function public.record_part_request(text, text, text, text, jsonb, text, text, text) is
  'Upserts a part request and counts demand once per client per day. Service role only.';

revoke all on function public.record_part_request(text, text, text, text, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.record_part_request(text, text, text, text, jsonb, text, text, text) to service_role;
