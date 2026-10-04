# HelpmeSolder

MCP-powered how-to solder guides for non-EE builders. Not an LLM. Not a simulator.

Claude/Cursor plans in chat → MCP tools write a guide → secret URL shows prep → full wiring diagram → steps. Same URL updates when chat iterates.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Vercel Hobby (`helpmesolder`)
- Supabase Postgres (org `perez`, project `helpmesolder`)
- Thin MCP server → Vercel API → Supabase → `/guides/[id]`

## Phase 0

- App scaffold
- `GET /api/health`
- Empty `/guides/[id]` shell
- Vercel + Supabase projects created

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Env

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side API writes (never expose client-side) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for guide links |

## MCP tools (planned)

`create_guide`, `set_power_source`, `add_part`, `add_connection`, `set_steps`, `get_guide`, `list_catalog`, `validate_guide`

## Architecture

```
Cursor/Claude → MCP server → Next.js API → Supabase guides → /guides/[id]
```
