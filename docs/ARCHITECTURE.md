# Architecture

## Shape

```
Cursor/Claude
    → thin MCP server
    → Vercel Next.js API
    → Supabase Postgres (guides)
    → /guides/[id]
```

## Responsibilities

| Layer | Owns |
| --- | --- |
| Cursor/Claude | Planning conversation with the builder |
| MCP server | Tool surface for the LLM (`create_guide`, etc.) |
| Next.js API | Persistence, validation, catalog reads |
| Supabase | Guide documents |
| `/guides/[id]` | Canonical human-readable guide |

## MCP tools

- `create_guide`
- `set_power_source`
- `add_part`
- `add_connection`
- `set_steps`
- `get_guide`
- `list_catalog`
- `validate_guide`

MCP is thin. Business rules live in the Next.js API + shared libs.

## Data model (v1)

`guides` row:

- `id` — unguessable secret id
- `title`
- `power_source` — `battery` | `usb_wall` | null
- `board_id` — catalog board id
- `parts` — jsonb array of part instances
- `connections` — jsonb array of pin-to-pin links
- `steps` — jsonb ordered steps
- `notes` — jsonb string array
- `created_at` / `updated_at`

Catalog (boards, modules, recipes) lives in repo code for v1 so it versions with the app.

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
