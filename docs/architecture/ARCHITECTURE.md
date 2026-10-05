# Architecture

## Shape

```
AI client (Claude, ChatGPT, Cursor, Codex, Antigravity)
    → hosted MCP endpoint /mcp (Streamable HTTP, inside the Next.js app)
    → shared libs (catalog, validator, repository)
    → Supabase Postgres (guides)
    → /guides/[id]
```

The original stdio server in `mcp/` calls the HTTP API instead and is kept only for local development; see [`mcp/README.md`](../../mcp/README.md).

## Responsibilities

| Layer | Owns |
| --- | --- |
| Cursor/Claude | Planning conversation with the builder |
| MCP server | Tool surface for the LLM (`create_guide`, etc.) |
| Next.js API | Persistence, validation, catalog reads |
| Supabase | Guide documents |
| `/guides/[id]` | Canonical human-readable guide |

## MCP tools

Registered in `src/lib/mcp/tools.ts`:

- `create_guide`
- `ask_power_source` (the assistant must ask the user, never guess)
- `ask_sensor` (same, for sensor and input modules)
- `set_power_source`
- `add_part`
- `add_connection`
- `set_steps`
- `get_guide`
- `get_guide_link`
- `list_catalog` (compact: id, name, kind, category, summary)
- `search_catalog`
- `get_part_details` (full detail of one part: identify, variants, watchOuts, pins, electrical limits, look-alikes)
- `request_part`
- `validate_guide`

MCP is thin. Business rules live in the Next.js API + shared libs.

## Data model (v1)

`guides` row:

- `id` — unguessable secret id
- `title`
- `power_source` — `usb_wall`, `power_bank`, a battery id (`battery_4aa`, `battery_3aa_nimh`, `battery_cr2032`, `battery_lipo_1s`, `battery_18650`, ...), a barrel supply (`supply_barrel_9v`, `supply_barrel_12v`) or null. The full list lives in `src/lib/catalog/battery-records.ts` (legacy `battery` still means `battery_3aa`)
- `board_id` — catalog board id
- `parts` — jsonb array of part instances
- `connections` — jsonb array of pin-to-pin links
- `steps` — jsonb ordered steps
- `notes` — jsonb string array
- `created_at` / `updated_at`

Catalog (boards, modules, passives, batteries, recipes) lives in repo code under `src/lib/catalog/` so it versions with the app. Photos and drawings are indexed by `part-media.ts` and the asset registry. (The catalog is being moved into the database; this page will be updated when that lands.)

## API surface (v1)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness |
| GET | `/api/catalog` | Boards, modules, recipes |
| POST | `/api/guides` | Create guide + return secret URL |
| GET | `/api/guides/[id]` | Fetch guide + validation |
| PATCH | `/api/guides/[id]` | Update parts/connections/steps/etc. |
| PUT | `/api/guides/[id]/power` | Set power source |
| POST | `/api/guides/[id]/validate` | Validate only |

Access: with `ALLOW_PUBLIC_API=true` anyone may call the API (per-IP/key rate limits apply). Otherwise a matching `MCP_API_KEY` (Bearer / `x-api-key`) is required. A key that is presented must always match.

## Validation

`validateGuide(guide)` returns:

- `ok`
- `needsPowerSource`
- `issues[]` with `code`, `message`, `alternatives[]`

Hard block: PATCH returns `422` when validation fails after update.

## Rendering

- Guide page reads guide by id
- Prep list from `parts` + catalog metadata
- Wiring diagram from catalog SVG skeletons + connections
- Steps/notes from guide fields

No LLM image generation.

## Infra

- Vercel Hobby project: `helpmesolder`
- Supabase org: `perez`, project: `helpmesolder`
- Free tier

## Auth model

- No end-user login in v1
- Secrecy of `/guides/[id]` is the access control
- Server uses Supabase service role when available; anon + RLS is Phase 1 fallback for API writes

## Trust boundaries

- Browser never gets the service role key
- MCP → API may use `MCP_API_KEY`
- Catalog is trusted code, not LLM output
- LLM may propose pins; validator may reject them
