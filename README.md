# HelpmeSolder

MCP-powered how-to solder guides for non-EE builders. Not an LLM. Not a simulator.

Claude/Cursor plans in chat → MCP tools write a guide → secret URL shows prep → full wiring diagram → steps. Same URL updates when chat iterates.

## Docs

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — frozen one-liner
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product lock
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system shape
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — build handoff
- [`BUILD_PLAN.md`](BUILD_PLAN.md) — phased checklist

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Vercel Hobby (`helpmesolder`)
- Supabase Postgres (org `perez`, project `helpmesolder`)
- Thin MCP server → Vercel API → Supabase → `/guides/[id]`

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
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side API writes (preferred) |
| `MCP_API_KEY` | Optional bearer key for tool APIs |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for guide links |

## Current slice

Phases 0–2 done in app. MCP lives in `mcp/`. Seed recipes with `npm run seed:recipes`.

## MCP

See [`mcp/README.md`](mcp/README.md) for Cursor/Claude config and tools.
