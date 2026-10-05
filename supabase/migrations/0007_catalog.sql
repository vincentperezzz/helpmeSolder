-- Part catalog in the database (see docs/plans/PLAN_CATALOG_IN_DATABASE.md).
-- Additive and idempotent: safe to run before the code ships and more than
-- once. With zero rows in catalog_parts / catalog_recipes the app behaves
-- exactly as before (the bundled seed is the default registry).
--
-- catalog_parts / catalog_recipes: one row per entity. published = the live
--   override document (null = no field overrides, e.g. a lifecycle-only row),
--   draft = unpublished work in progress, seed_base = the seed document the
--   admin started from (three-way merge base), version = optimistic lock.
-- catalog_media: uploaded photos, keyed by photo hint, licence required.
-- catalog_history: append-only audit trail (no UPDATE / DELETE, even for the
--   service role: privileges revoked AND a trigger raises).
-- catalog_settings: single row, mode db|seed (kill switch) + global version
--   bumped on every publish so other instances can detect change.
--
-- All tables: RLS on, no access for anon / authenticated. All RPCs are
-- security invoker and executable by service_role only.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.catalog_parts (
  id text primary key
    check (id ~ '^(board|module|passive)\.[a-z0-9][a-z0-9._-]{0,61}$'),
  kind text not null check (kind in ('board', 'module', 'passive')),
  published jsonb check (published is null or pg_column_size(published) < 262144),
  draft jsonb check (draft is null or pg_column_size(draft) < 262144),
  seed_base jsonb check (seed_base is null or pg_column_size(seed_base) < 262144),
  origin text not null default 'admin' check (origin in ('seed', 'admin')),
  lifecycle text not null default 'active' check (lifecycle in ('active', 'deprecated')),
  replaced_by text,
  version int not null default 1 check (version >= 1),
  updated_by text,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint catalog_parts_kind_matches_id check (split_part(id, '.', 1) = kind),
  constraint catalog_parts_replaced_by_shape check (
    replaced_by is null
    or (lifecycle = 'deprecated' and replaced_by ~ '^(board|module|passive)\.[a-z0-9][a-z0-9._-]{0,61}$' and replaced_by <> id)
  )
);

comment on table public.catalog_parts is
  'Admin-managed overrides and additions to the bundled part catalog. Service role only.';
comment on column public.catalog_parts.published is 'Live document. Null = no field overrides (lifecycle-only row).';
comment on column public.catalog_parts.seed_base is 'Seed document the admin started from; base of the three-way merge.';
comment on column public.catalog_parts.version is 'Optimistic lock; bumped on every change to the row.';

create table if not exists public.catalog_recipes (
  id text primary key
    check (id ~ '^[a-z0-9][a-z0-9._-]{0,61}$'),
  published jsonb check (published is null or pg_column_size(published) < 262144),
  draft jsonb check (draft is null or pg_column_size(draft) < 262144),
  seed_base jsonb check (seed_base is null or pg_column_size(seed_base) < 262144),
  origin text not null default 'admin' check (origin in ('seed', 'admin')),
  lifecycle text not null default 'active' check (lifecycle in ('active', 'deprecated')),
  replaced_by text,
  version int not null default 1 check (version >= 1),
  updated_by text,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint catalog_recipes_replaced_by_shape check (
    replaced_by is null
    or (lifecycle = 'deprecated' and replaced_by ~ '^[a-z0-9][a-z0-9._-]{0,61}$' and replaced_by <> id)
  )
);

comment on table public.catalog_recipes is
  'Admin-managed overrides and additions to the bundled recipes. Same shape as catalog_parts, without kind. Service role only.';

create table if not exists public.catalog_media (
  photo_hint text primary key check (char_length(photo_hint) between 1 and 200),
  url text not null check (char_length(url) between 1 and 2048),
  storage_path text,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml')),
  bytes int not null check (bytes between 500 and 1048576),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  license text not null check (char_length(btrim(license)) between 1 and 200),
  author text check (author is null or char_length(author) <= 200),
  source_url text check (source_url is null or char_length(source_url) <= 2048),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.catalog_media is
  'Uploaded catalog photos keyed by photo hint. Licence is required. Service role only.';

create table if not exists public.catalog_history (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  entity text not null check (entity in ('part', 'recipe', 'media', 'settings')),
  entity_id text not null,
  action text not null check (action in (
    'import', 'save_draft', 'discard_draft', 'publish', 'revert',
    'deprecate', 'restore', 'seed_sync', 'take_code', 'settings'
  )),
  actor text,
  version int,
  data jsonb,
  prev jsonb,
  note text check (note is null or char_length(note) <= 500)
);

comment on table public.catalog_history is
  'Append-only audit trail of catalog changes. UPDATE and DELETE are blocked by privileges and a trigger.';

create table if not exists public.catalog_settings (
  id smallint primary key default 1 check (id = 1),
  mode text not null default 'db' check (mode in ('db', 'seed')),
  version bigint not null default 1,
  updated_by text,
  updated_at timestamptz not null default now()
);

comment on table public.catalog_settings is
  'Single-row catalog settings. mode = seed is the kill switch (ignore the DB). version bumps on every publish.';

insert into public.catalog_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists catalog_parts_kind_idx on public.catalog_parts (kind);
create index if not exists catalog_parts_updated_idx on public.catalog_parts (updated_at desc);
create index if not exists catalog_recipes_updated_idx on public.catalog_recipes (updated_at desc);
create index if not exists catalog_history_entity_idx
  on public.catalog_history (entity, entity_id, id desc);
create index if not exists catalog_history_at_idx on public.catalog_history (at desc);

-- ---------------------------------------------------------------------------
-- Append-only history: trigger (blocks superuser-level UPDATE/DELETE too)
-- ---------------------------------------------------------------------------

create or replace function public.catalog_history_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'catalog_history is append-only';
end;
$$;

drop trigger if exists catalog_history_no_update on public.catalog_history;
create trigger catalog_history_no_update
  before update or delete on public.catalog_history
  for each row execute function public.catalog_history_immutable();

-- ---------------------------------------------------------------------------
-- RLS and privileges
-- ---------------------------------------------------------------------------

alter table public.catalog_parts enable row level security;
alter table public.catalog_recipes enable row level security;
alter table public.catalog_media enable row level security;
alter table public.catalog_history enable row level security;
alter table public.catalog_settings enable row level security;

revoke all on table public.catalog_parts from anon, authenticated;
revoke all on table public.catalog_recipes from anon, authenticated;
revoke all on table public.catalog_media from anon, authenticated;
revoke all on table public.catalog_history from anon, authenticated;
revoke all on table public.catalog_settings from anon, authenticated;

-- History is insert/select only, even for the app's service role.
revoke update, delete, truncate on table public.catalog_history from service_role;

-- ---------------------------------------------------------------------------
-- Internal helpers (not exposed)
-- ---------------------------------------------------------------------------

create or replace function public.catalog_table(p_entity text)
returns text
language plpgsql
immutable
as $$
begin
  if p_entity = 'part' then
    return 'catalog_parts';
  elsif p_entity = 'recipe' then
    return 'catalog_recipes';
  end if;
  raise exception 'bad_entity';
end;
$$;

-- Bumps the global catalog version in the caller's transaction.
create or replace function public.catalog_bump_version(p_actor text)
returns bigint
language plpgsql
security invoker
as $$
declare
  v bigint;
begin
  insert into public.catalog_settings (id) values (1) on conflict do nothing;
  update public.catalog_settings
    set version = version + 1, updated_by = p_actor, updated_at = now()
    where id = 1
    returning version into v;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Saves (or creates) the draft. p_expected_version = 0 means "row must not
-- exist yet". Returns the new row version. Does not bump the global version.
create or replace function public.catalog_save_draft(
  p_entity text,
  p_id text,
  p_expected_version int,
  p_draft jsonb,
  p_kind text,
  p_actor text,
  p_seed_base jsonb default null
) returns int
language plpgsql
security invoker
as $$
declare
  tbl text := public.catalog_table(p_entity);
  v_ver int;
  v_new int;
  v_prev jsonb;
begin
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'bad_document';
  end if;

  execute format('select version, draft from public.%I where id = $1 for update', tbl)
    into v_ver, v_prev using p_id;

  if v_ver is null then
    if coalesce(p_expected_version, 0) <> 0 then
      raise exception 'version_conflict';
    end if;
    v_new := 1;
    if p_entity = 'part' then
      insert into public.catalog_parts
        (id, kind, draft, seed_base, origin, version, updated_by)
      values
        (p_id, coalesce(p_kind, split_part(p_id, '.', 1)), p_draft, p_seed_base,
         case when p_seed_base is null then 'admin' else 'seed' end, 1, p_actor);
    else
      insert into public.catalog_recipes
        (id, draft, seed_base, origin, version, updated_by)
      values
        (p_id, p_draft, p_seed_base,
         case when p_seed_base is null then 'admin' else 'seed' end, 1, p_actor);
    end if;
  else
    if p_expected_version is distinct from v_ver then
      raise exception 'version_conflict';
    end if;
    v_new := v_ver + 1;
    execute format(
      'update public.%I set draft = $2, seed_base = coalesce(seed_base, $3), '
      'version = $4, updated_by = $5, updated_at = now() where id = $1', tbl)
      using p_id, p_draft, p_seed_base, v_new, p_actor;
  end if;

  insert into public.catalog_history (entity, entity_id, action, actor, version, data, prev)
  values (p_entity, p_id, 'save_draft', p_actor, v_new, p_draft, v_prev);

  return v_new;
end;
$$;

-- Publishes p_doc: published = p_doc, draft cleared, row version and the
-- global catalog version bumped in one transaction. Returns the row version.
create or replace function public.catalog_publish(
  p_entity text,
  p_id text,
  p_expected_version int,
  p_doc jsonb,
  p_seed_base jsonb,
  p_actor text,
  p_note text
) returns int
language plpgsql
security invoker
as $$
declare
  tbl text := public.catalog_table(p_entity);
  v_ver int;
  v_prev jsonb;
  v_new int;
begin
  if p_doc is null or jsonb_typeof(p_doc) <> 'object' then
    raise exception 'bad_document';
  end if;

  execute format('select version, published from public.%I where id = $1 for update', tbl)
    into v_ver, v_prev using p_id;

  if v_ver is null then
    if coalesce(p_expected_version, 0) <> 0 then
      raise exception 'version_conflict';
    end if;
    v_new := 1;
    if p_entity = 'part' then
      insert into public.catalog_parts
        (id, kind, published, seed_base, origin, version, updated_by, published_at)
      values
        (p_id, split_part(p_id, '.', 1), p_doc, p_seed_base,
         case when p_seed_base is null then 'admin' else 'seed' end, 1, p_actor, now());
    else
      insert into public.catalog_recipes
        (id, published, seed_base, origin, version, updated_by, published_at)
      values
        (p_id, p_doc, p_seed_base,
         case when p_seed_base is null then 'admin' else 'seed' end, 1, p_actor, now());
    end if;
  else
    if p_expected_version is distinct from v_ver then
      raise exception 'version_conflict';
    end if;
    v_new := v_ver + 1;
    execute format(
      'update public.%I set published = $2, draft = null, '
      'seed_base = coalesce(seed_base, $3), version = $4, updated_by = $5, '
      'updated_at = now(), published_at = now() where id = $1', tbl)
      using p_id, p_doc, p_seed_base, v_new, p_actor;
  end if;

  perform public.catalog_bump_version(p_actor);

  insert into public.catalog_history (entity, entity_id, action, actor, version, data, prev, note)
  values (p_entity, p_id, 'publish', p_actor, v_new, p_doc, v_prev, p_note);

  return v_new;
end;
$$;

-- Drops the draft. A never-published admin row with nothing left is removed
-- (returns 0); otherwise returns the new row version.
create or replace function public.catalog_discard_draft(
  p_entity text,
  p_id text,
  p_expected_version int,
  p_actor text
) returns int
language plpgsql
security invoker
as $$
declare
  tbl text := public.catalog_table(p_entity);
  v_ver int;
  v_draft jsonb;
  v_pub jsonb;
  v_origin text;
  v_new int;
begin
  execute format('select version, draft, published, origin from public.%I where id = $1 for update', tbl)
    into v_ver, v_draft, v_pub, v_origin using p_id;

  if v_ver is null or p_expected_version is distinct from v_ver then
    raise exception 'version_conflict';
  end if;

  if v_pub is null and v_origin = 'admin' then
    -- Only ever a draft: nothing live depends on this row.
    execute format('delete from public.%I where id = $1', tbl) using p_id;
    v_new := 0;
  else
    v_new := v_ver + 1;
    execute format(
      'update public.%I set draft = null, version = $2, updated_by = $3, updated_at = now() where id = $1', tbl)
      using p_id, v_new, p_actor;
  end if;

  insert into public.catalog_history (entity, entity_id, action, actor, version, data, prev)
  values (p_entity, p_id, 'discard_draft', p_actor, v_new, null, v_draft);

  return v_new;
end;
$$;

-- Deprecates (p_lifecycle = 'deprecated', optional p_replaced_by) or restores
-- ('active'). Creates a lifecycle-only row (published null) when p_expected_version
-- is 0 and the entity is only in the seed; pass p_seed_base then.
create or replace function public.catalog_set_lifecycle(
  p_entity text,
  p_id text,
  p_expected_version int,
  p_lifecycle text,
  p_replaced_by text,
  p_actor text,
  p_note text,
  p_seed_base jsonb default null
) returns int
language plpgsql
security invoker
as $$
declare
  tbl text := public.catalog_table(p_entity);
  v_ver int;
  v_old_life text;
  v_old_rep text;
  v_new int;
  v_rep text := case when p_lifecycle = 'deprecated' then p_replaced_by else null end;
begin
  if p_lifecycle not in ('active', 'deprecated') then
    raise exception 'bad_lifecycle';
  end if;

  execute format('select version, lifecycle, replaced_by from public.%I where id = $1 for update', tbl)
    into v_ver, v_old_life, v_old_rep using p_id;

  if v_ver is null then
    if coalesce(p_expected_version, 0) <> 0 then
      raise exception 'version_conflict';
    end if;
    v_new := 1;
    if p_entity = 'part' then
      insert into public.catalog_parts
        (id, kind, seed_base, origin, lifecycle, replaced_by, version, updated_by, published_at)
      values
        (p_id, split_part(p_id, '.', 1), p_seed_base,
         case when p_seed_base is null then 'admin' else 'seed' end,
         p_lifecycle, v_rep, 1, p_actor, now());
    else
      insert into public.catalog_recipes
        (id, seed_base, origin, lifecycle, replaced_by, version, updated_by, published_at)
      values
        (p_id, p_seed_base,
         case when p_seed_base is null then 'admin' else 'seed' end,
         p_lifecycle, v_rep, 1, p_actor, now());
    end if;
  else
    if p_expected_version is distinct from v_ver then
      raise exception 'version_conflict';
    end if;
    v_new := v_ver + 1;
    execute format(
      'update public.%I set lifecycle = $2, replaced_by = $3, seed_base = coalesce(seed_base, $4), '
      'version = $5, updated_by = $6, updated_at = now(), published_at = now() where id = $1', tbl)
      using p_id, p_lifecycle, v_rep, p_seed_base, v_new, p_actor;
  end if;

  perform public.catalog_bump_version(p_actor);

  insert into public.catalog_history (entity, entity_id, action, actor, version, data, prev, note)
  values (
    p_entity, p_id,
    case when p_lifecycle = 'deprecated' then 'deprecate' else 'restore' end,
    p_actor, v_new,
    jsonb_build_object('lifecycle', p_lifecycle, 'replacedBy', v_rep),
    case when v_old_life is null then null
         else jsonb_build_object('lifecycle', v_old_life, 'replacedBy', v_old_rep) end,
    p_note
  );

  return v_new;
end;
$$;

-- Publishes the snapshot stored in history row p_history_id as a new version.
-- The history row must belong to the same entity and carry a published document.
create or replace function public.catalog_revert(
  p_entity text,
  p_id text,
  p_history_id bigint,
  p_expected_version int,
  p_actor text,
  p_note text
) returns int
language plpgsql
security invoker
as $$
declare
  tbl text := public.catalog_table(p_entity);
  v_ver int;
  v_prev jsonb;
  v_snap jsonb;
  v_new int;
begin
  select h.data into v_snap
    from public.catalog_history h
    where h.id = p_history_id
      and h.entity = p_entity
      and h.entity_id = p_id
      and h.action in ('publish', 'revert', 'import', 'seed_sync', 'take_code');
  if v_snap is null or jsonb_typeof(v_snap) <> 'object' then
    raise exception 'history_not_found';
  end if;

  execute format('select version, published from public.%I where id = $1 for update', tbl)
    into v_ver, v_prev using p_id;
  if v_ver is null or p_expected_version is distinct from v_ver then
    raise exception 'version_conflict';
  end if;

  v_new := v_ver + 1;
  execute format(
    'update public.%I set published = $2, draft = null, version = $3, updated_by = $4, '
    'updated_at = now(), published_at = now() where id = $1', tbl)
    using p_id, v_snap, v_new, p_actor;

  perform public.catalog_bump_version(p_actor);

  insert into public.catalog_history (entity, entity_id, action, actor, version, data, prev, note)
  values (p_entity, p_id, 'revert', p_actor, v_new, v_snap, v_prev,
          coalesce(p_note, 'revert to history #' || p_history_id));

  return v_new;
end;
$$;

-- Kill switch / mode change. Returns the new global catalog version.
create or replace function public.catalog_set_mode(
  p_mode text,
  p_actor text,
  p_note text
) returns bigint
language plpgsql
security invoker
as $$
declare
  v_old text;
  v bigint;
begin
  if p_mode not in ('db', 'seed') then
    raise exception 'bad_mode';
  end if;
  insert into public.catalog_settings (id) values (1) on conflict do nothing;
  select mode into v_old from public.catalog_settings where id = 1 for update;
  update public.catalog_settings set mode = p_mode where id = 1;
  v := public.catalog_bump_version(p_actor);
  insert into public.catalog_history (entity, entity_id, action, actor, data, prev, note)
  values ('settings', 'mode', 'settings', p_actor,
          jsonb_build_object('mode', p_mode), jsonb_build_object('mode', v_old), p_note);
  return v;
end;
$$;

-- How many saved guides use a part, and which of its pins they connect.
-- guides.parts is a jsonb array of {instanceId, catalogId}; guides.connections
-- is a jsonb array of {from: {instanceId, pinId}, to: {instanceId, pinId}}.
create or replace function public.catalog_part_usage(p_id text)
returns table (guides int, pins text[])
language sql
stable
security invoker
as $$
  with g as (
    select gd.id, gd.parts, gd.connections
    from public.guides gd
    where jsonb_typeof(gd.parts) = 'array'
      and gd.parts @> jsonb_build_array(jsonb_build_object('catalogId', p_id))
  ),
  inst as (
    select g.id as guide_id, e ->> 'instanceId' as instance_id
    from g, jsonb_array_elements(g.parts) e
    where e ->> 'catalogId' = p_id
  ),
  ends as (
    select g.id as guide_id, side -> 'from' as s
    from g, jsonb_array_elements(case when jsonb_typeof(g.connections) = 'array' then g.connections else '[]'::jsonb end) side
    union all
    select g.id, side -> 'to'
    from g, jsonb_array_elements(case when jsonb_typeof(g.connections) = 'array' then g.connections else '[]'::jsonb end) side
  ),
  used as (
    select distinct ends.s ->> 'pinId' as pin_id
    from ends
    join inst on inst.guide_id = ends.guide_id
             and inst.instance_id = ends.s ->> 'instanceId'
    where ends.s ->> 'pinId' is not null
  )
  select
    (select count(*)::int from g),
    coalesce((select array_agg(pin_id order by pin_id) from used), '{}'::text[]);
$$;

-- Inserts or replaces the media row for a photo hint and logs it.
-- Returns the new global catalog version.
create or replace function public.catalog_upsert_media(
  p_photo_hint text,
  p_url text,
  p_storage_path text,
  p_mime text,
  p_bytes int,
  p_width int,
  p_height int,
  p_sha256 text,
  p_license text,
  p_author text,
  p_source_url text,
  p_actor text,
  p_note text
) returns bigint
language plpgsql
security invoker
as $$
declare
  v_prev jsonb;
  v bigint;
begin
  select to_jsonb(m) - 'created_at' - 'updated_at' into v_prev
    from public.catalog_media m where m.photo_hint = p_photo_hint for update;

  insert into public.catalog_media as m
    (photo_hint, url, storage_path, mime, bytes, width, height, sha256, license, author, source_url, updated_by)
  values
    (p_photo_hint, p_url, p_storage_path, p_mime, p_bytes, p_width, p_height, p_sha256,
     p_license, p_author, p_source_url, p_actor)
  on conflict (photo_hint) do update set
    url = excluded.url,
    storage_path = excluded.storage_path,
    mime = excluded.mime,
    bytes = excluded.bytes,
    width = excluded.width,
    height = excluded.height,
    sha256 = excluded.sha256,
    license = excluded.license,
    author = excluded.author,
    source_url = excluded.source_url,
    updated_by = excluded.updated_by,
    updated_at = now();

  v := public.catalog_bump_version(p_actor);

  insert into public.catalog_history (entity, entity_id, action, actor, data, prev, note)
  values ('media', p_photo_hint, 'publish', p_actor,
          jsonb_build_object('url', p_url, 'storagePath', p_storage_path, 'mime', p_mime,
                             'bytes', p_bytes, 'width', p_width, 'height', p_height,
                             'sha256', p_sha256, 'license', p_license, 'author', p_author,
                             'sourceUrl', p_source_url),
          v_prev, p_note);

  return v;
end;
$$;

-- Execute: service_role only (public / anon / authenticated revoked).
revoke all on function public.catalog_history_immutable() from public, anon, authenticated;
revoke all on function public.catalog_table(text) from public, anon, authenticated;
revoke all on function public.catalog_bump_version(text) from public, anon, authenticated;
revoke all on function public.catalog_save_draft(text, text, int, jsonb, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.catalog_publish(text, text, int, jsonb, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.catalog_discard_draft(text, text, int, text) from public, anon, authenticated;
revoke all on function public.catalog_set_lifecycle(text, text, int, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.catalog_revert(text, text, bigint, int, text, text) from public, anon, authenticated;
revoke all on function public.catalog_set_mode(text, text, text) from public, anon, authenticated;
revoke all on function public.catalog_part_usage(text) from public, anon, authenticated;
revoke all on function public.catalog_upsert_media(text, text, text, text, int, int, int, text, text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.catalog_bump_version(text) to service_role;
grant execute on function public.catalog_table(text) to service_role;
grant execute on function public.catalog_save_draft(text, text, int, jsonb, text, text, jsonb) to service_role;
grant execute on function public.catalog_publish(text, text, int, jsonb, jsonb, text, text) to service_role;
grant execute on function public.catalog_discard_draft(text, text, int, text) to service_role;
grant execute on function public.catalog_set_lifecycle(text, text, int, text, text, text, text, jsonb) to service_role;
grant execute on function public.catalog_revert(text, text, bigint, int, text, text) to service_role;
grant execute on function public.catalog_set_mode(text, text, text) to service_role;
grant execute on function public.catalog_part_usage(text) to service_role;
grant execute on function public.catalog_upsert_media(text, text, text, text, int, int, int, text, text, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded images: public read, no client write policies
-- (uploads go through the server with the service role / signed upload URLs).
-- Guarded so the migration also runs where the storage schema is absent.
-- ---------------------------------------------------------------------------

do $do$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'catalog-media', 'catalog-media', true, 1048576,
      array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    )
    on conflict (id) do nothing;
  end if;
end;
$do$;

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual, not run automatically). The migration is additive, so the
-- app keeps working with these objects present; drop only to remove the
-- feature entirely. Fastest kill switch without dropping anything:
--   update public.catalog_settings set mode = 'seed' where id = 1;
--
-- drop function if exists public.catalog_upsert_media(text, text, text, text, int, int, int, text, text, text, text, text, text);
-- drop function if exists public.catalog_part_usage(text);
-- drop function if exists public.catalog_set_mode(text, text, text);
-- drop function if exists public.catalog_revert(text, text, bigint, int, text, text);
-- drop function if exists public.catalog_set_lifecycle(text, text, int, text, text, text, text, jsonb);
-- drop function if exists public.catalog_discard_draft(text, text, int, text);
-- drop function if exists public.catalog_publish(text, text, int, jsonb, jsonb, text, text);
-- drop function if exists public.catalog_save_draft(text, text, int, jsonb, text, text, jsonb);
-- drop function if exists public.catalog_bump_version(text);
-- drop function if exists public.catalog_table(text);
-- drop trigger if exists catalog_history_no_update on public.catalog_history;
-- drop function if exists public.catalog_history_immutable();
-- drop table if exists public.catalog_history;
-- drop table if exists public.catalog_media;
-- drop table if exists public.catalog_recipes;
-- drop table if exists public.catalog_parts;
-- drop table if exists public.catalog_settings;
-- delete from storage.objects where bucket_id = 'catalog-media';
-- delete from storage.buckets where id = 'catalog-media';
