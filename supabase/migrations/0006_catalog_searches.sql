-- What AI assistants search the catalog for (MCP search_catalog, and the free
-- text intent of ask_sensor), including searches that found nothing.
-- catalog_searches: one row per normalized query. demand = number of distinct
-- client-days that searched; searches = raw number of searches;
-- no_match_searches = searches that matched no catalog part. The admin triages
-- rows with status / admin_note.
-- catalog_search_hits: dedupe table (one row per query per day per anonymous
-- client hash, same one-way daily hash as daily_clients). No IP and no user
-- agent are stored. Purged after 180 days by the cleanup cron. Idempotent.

create table if not exists public.catalog_searches (
  key text primary key,
  query text not null,
  source text not null,
  demand int not null default 0,
  searches int not null default 0,
  no_match_searches int not null default 0,
  last_result_count int not null default 0,
  top_match_id text,
  top_score numeric,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new', 'handled', 'ignored')),
  admin_note text,
  updated_at timestamptz not null default now()
);

comment on table public.catalog_searches is
  'Catalog searches made by AI assistants, one row per normalized query, with the latest outcome.';
comment on column public.catalog_searches.key is 'Normalized query: lowercase, no prefix, alphanumerics only, max 80 chars.';
comment on column public.catalog_searches.source is 'Which tool searched: search_catalog or ask_sensor.';
comment on column public.catalog_searches.demand is 'Distinct client-days that searched for this.';
comment on column public.catalog_searches.searches is 'Raw number of searches.';
comment on column public.catalog_searches.no_match_searches is 'Searches that matched no catalog part.';
comment on column public.catalog_searches.last_result_count is 'Number of catalog parts matched by the latest search.';
comment on column public.catalog_searches.top_match_id is 'Catalog id of the best match of the latest search, if any.';
comment on column public.catalog_searches.status is 'Admin triage: new, handled, ignored.';

create table if not exists public.catalog_search_hits (
  key text not null,
  day date not null,
  client_hash text not null,
  primary key (key, day, client_hash)
);

comment on table public.catalog_search_hits is
  'Dedupe of catalog searches per anonymous daily client hash. Purged after 180 days.';

create index if not exists catalog_searches_demand_idx
  on public.catalog_searches (demand desc, last_seen desc);

alter table public.catalog_searches enable row level security;
alter table public.catalog_search_hits enable row level security;
revoke all on public.catalog_searches from anon, authenticated;
revoke all on public.catalog_search_hits from anon, authenticated;

create or replace function public.record_catalog_search(
  p_key text,
  p_query text,
  p_source text,
  p_result_count int,
  p_top_match_id text,
  p_top_score numeric,
  p_client_hash text
) returns void
language plpgsql
security invoker
as $$
declare
  inserted int;
begin
  insert into public.catalog_searches as s
    (key, query, source, searches, no_match_searches, last_result_count, top_match_id, top_score)
  values
    (p_key, p_query, p_source, 1, case when p_result_count = 0 then 1 else 0 end,
     p_result_count, p_top_match_id, p_top_score)
  on conflict (key) do update set
    searches = s.searches + 1,
    no_match_searches = s.no_match_searches + case when p_result_count = 0 then 1 else 0 end,
    last_result_count = p_result_count,
    top_match_id = p_top_match_id,
    top_score = p_top_score,
    query = p_query,
    last_seen = now(),
    updated_at = now();

  insert into public.catalog_search_hits (key, day, client_hash)
  values (p_key, current_date, p_client_hash)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted > 0 then
    update public.catalog_searches set demand = demand + 1 where key = p_key;
  end if;
end;
$$;

comment on function public.record_catalog_search(text, text, text, int, text, numeric, text) is
  'Upserts a catalog search with its outcome and counts demand once per client per day. Service role only.';

revoke all on function public.record_catalog_search(text, text, text, int, text, numeric, text) from public, anon, authenticated;
grant execute on function public.record_catalog_search(text, text, text, int, text, numeric, text) to service_role;
