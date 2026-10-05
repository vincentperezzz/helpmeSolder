# Plan: move the part catalog into the database

Status: in progress (P0 and P1 first). The TypeScript files stay as the seed.

Goal: adding or fixing parts (text, pins, electrical data, images, photo phrases, recipes) must not need a PR and deploy. The admin manages the catalog.

## Rules

1. **Zero rows means today's behaviour.** The bundled seed (`boards.ts`, `modules.ts`, `passives.ts`, `recipes.ts`, media maps, photo queries) is the default registry everywhere: server, client, tests, scripts.
2. **The DB only overrides or adds.** For a seeded part the effective record is a three-way merge (base = `seed_base`, ours = published row, theirs = current seed) at top-level field granularity. A code change goes live on deploy for every field the admin did not touch. Both changed: admin wins and the field is listed on the Drift page.
3. **Never delete.** Parts are deprecated (`deprecated`, `replacedBy`): still resolvable by id so old guides render, hidden from lists, search and pickers.
4. **Kill switch.** `catalog_settings.mode = 'seed'` or env `CATALOG_SOURCE=seed` ignores the DB.
5. **Code-owned in v1:** battery kinds and voltages (`battery-records.ts`), board SVG geometry (`board-assets.ts`), new Wokwi elements. Battery part text stays editable.

## Runtime

- `src/lib/catalog/seed.ts`: `buildSeedSnapshot()`, `SEED_SNAPSHOT`.
- `src/lib/catalog/registry.ts`: `getActiveCatalog()`, `swapCatalog()`, `resetCatalogToSeed()`, pure `buildSnapshot(seed, rows)` and `mergeSeeded()`. One module variable `active`, atomic swap of a frozen object. Consumers are synchronous, so a swap never lands mid-call.
- `src/lib/catalog/index.ts`: same signatures (`getCatalogPart`, `listCatalog`, `getRecipe`) now read the active snapshot. `getCatalogPart` includes deprecated parts; `listCatalog` excludes them. `part-media.ts` and `photo-queries.ts` export their tables as `SEED_*` and read the registry. `partCategory()` honours an optional `category` field.
- `src/lib/catalog/server.ts` (server only): `ensureCatalog()`.
  - warm (checked under 15 s ago): return at once.
  - stale: refresh, wait at most 300 ms, finish in `after()`.
  - cold: wait at most 800 ms, else serve the seed and finish in `after()`.
  - rows come from `unstable_cache(fetchCatalogRows, ["catalog-rows-v1"], { tags: ["catalog"], revalidate: 300 })`.
  - failure keeps the last good snapshot (else the seed) and backs off 30 s.
  - admin publish: `revalidateTag("catalog", { expire: 0 })`, reset local throttle, forced refresh. Spike in P1 to confirm tag expiry reaches `unstable_cache`; fallback is a version-keyed cache.
- Every entry point (guide page, `api/**`, `mcp/route.ts`, admin pages and actions) calls `await ensureCatalog()` first. A test scans `src/app/**` for forgotten ones.
- Client: the seed is already bundled. The guide page sends a small overlay (only parts that differ from the seed, for the guide's parts, board and power parts; cap 64 KB) through `<CatalogOverlay>`, applied in render before children, in both the browser and the SSR module graph.

## Database (`supabase/migrations/0007_catalog.sql`, idempotent, additive)

- `catalog_parts(id pk, kind, published jsonb, draft jsonb, seed_base jsonb, origin seed|admin, lifecycle active|deprecated, replaced_by, version int, updated_by, updated_at, published_at, created_at)` with id pattern `^(board|module|passive)\.[a-z0-9][a-z0-9._-]{0,61}$` and a size check.
- `catalog_recipes` (same shape), `catalog_media(photo_hint pk, url, storage_path, mime, bytes, width, height, sha256, license not null, author, source_url)`, `catalog_history` (append-only audit with actions import, save_draft, discard_draft, publish, revert, deprecate, restore, seed_sync, take_code, settings), `catalog_settings` (single row: mode, version).
- RLS on, all privileges revoked from anon and authenticated (as in 0002/0003/0005). RPCs are `security invoker`, granted to `service_role` only: `catalog_save_draft`, `catalog_publish`, `catalog_set_lifecycle`, `catalog_part_usage`, `catalog_upsert_media`. Storage bucket `catalog-media` (public read, no client write policies).
- Rollback DDL is commented at the bottom of the migration.

## Validation

- `schema.ts` (zod 4, strict): id immutable and prefix matches kind; text limits; pins (unique ids, kinds enum, voltage); electrical ranges (min <= nominal <= max, pin references exist); Wokwi tag must exist in `@wokwi/elements` (generated list `wokwi-tags.generated.ts`); text sanitising (NFC, strip control and bidi characters, reject HTML-like tags and `javascript:`).
- `checks.ts` publish checks, pure with an injected context. Errors block: schema, missing thumbnail, missing 1 to 4 photo phrases, duplicate pin ids, bad electrical references, a pin removed or renamed while saved guides use it (via `catalog_part_usage`), kind change while used, deprecating a part a recipe uses, bad `replacedBy`, id collision. Warnings: no drawing, Wokwi pin mismatch, electrical impact on up to 30 recent guides, duplicate name or hint, guessed category.
- Locked fields: battery pins and electrical, the breadboard pins, pin ids of parts with a board SVG.

## Admin (`/admin/catalog/*`)

Sub-navigation: Coverage (existing), Parts, Recipes, Media, Drift, Transfer. Editor with live preview of the Parts card and the diagram drawing, pins editor, electrical editor with units, draft and publish, history with field diff and revert, duplicate, deprecate, JSON export and import with dry run, image upload (signed URL, MIME and magic-byte check, size limit, licence required, strict SVG rejection rules), "Sync from code" and Drift resolution.

## Phases (one PR each)

- **P0** registry refactor, no behaviour change: `seed.ts`, `registry.ts`, `index.ts`, `part-media.ts`, `photo-queries.ts`, `types.ts`, test setup forcing the seed; plus `schema.ts`, `checks.ts`, wokwi tags generator, id ledger.
- **P1** DB read path and kill switch: migration 0007, `server.ts`, `db/rows.ts`, fake Supabase, entry-point `ensureCatalog()` calls, entrypoints test, `asset-registry.ts` reads the live registry. Deploys with an empty table and identical behaviour.
- **P2** client overlay and `PartCardView` extraction; `&v=` photo cache buster.
- **P3** admin editor v1 (text fields, draft, publish, history, revert, deprecate).
- **P4** pins and electrical editors, preview, new and duplicate part.
- **P5** media upload, recipes, transfer, sync and drift.
- **P6** request-to-draft, docs, `catalog:pull` script.

Estimate about 15 developer-days; 2 to 3 parallel agents per phase with disjoint files.

## Defaults chosen for the open questions (change any time)

1. Audit actor is "admin" plus a session fingerprint (single shared password).
2. Batteries and power sources stay code-owned.
3. Board SVG geometry stays code-owned.
4. Deprecated parts still work in `add_part` with a "retired, prefer X" note.
5. Draft preview is admin-only.
6. The DB becomes the master; the seed stays as the fallback and test fixture; an optional `catalog:pull` can write admin edits back.
7. SVG uploads allowed with strict rejection rules.
8. About 15 s propagation after a publish is acceptable; the publishing admin sees it at once.
9. Licence backfill for existing `/photos/*` files on the Media page later.
10. Use a Supabase Storage bucket for new images.

## Risks and rollback

Risks: client bundle (none in v1, overlay is usually empty), cold-start latency (capped waits, seed fallback), stale instances (tag expiry plus 15 s throttle plus 300 s safety net), two module graphs (overlay applied in both), jsonb type safety (parsed on read and write, bad rows skipped and reported), admin electrical mistakes (range checks, impact preview, revert, kill switch).

Rollback, fastest first: revert one part; admin kill switch; `CATALOG_SOURCE=seed` and redeploy; Vercel instant rollback (migration is additive); drop the tables.
