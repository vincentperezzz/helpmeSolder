# Development guide

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev                  # http://localhost:3000
```

Node 20.9 or newer is required (Next.js 16). Never commit `.env.local`.

Without Supabase credentials the pages that need the database will not work. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for what each variable does and [`supabase/README.md`](../../supabase/README.md) for the migrations.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Vitest, once (`vitest run`) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run seed:recipes` | Creates the canned demo guides through a running API (`HELPMESOLDER_API_URL`, default `http://localhost:3000`; `MCP_API_KEY` if the API is private). It writes real guides, so point it at a dev instance. |
| `node scripts/gen-battery-art.mjs` | Regenerates battery drawings and `battery-geometry.generated.ts`; see `public/assets/batteries/README.md` |
| `npm run mcp:build` / `mcp:dev` | Legacy stdio MCP server in `mcp/` |

## Windows notes

On the Windows machine this project is developed on, the default `node` on `PATH` crashes when running Vitest or Next/Turbopack. Use a different Node binary explicitly, for example:

```bash
"C:/Users/<you>/AppData/Local/ms-playwright-go/1.57.0/node.exe" node_modules/vitest/vitest.mjs run
```

If `next build` misbehaves under Turbopack, run it with the same alternate Node binary. Treat this as a local workaround, not a project requirement.

## Next.js version

This repo uses a Next.js version with breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before changing Next.js code (see [`AGENTS.md`](../../AGENTS.md)).

## Testing the MCP endpoint

The hosted endpoint is `POST /mcp` (Streamable HTTP). Route tests live in `src/app/mcp/`. To try it with a real client, point the client at `http://localhost:3000/mcp` with `ALLOW_PUBLIC_API=true` in `.env.local`.

## Adding a part

Parts, photos and drawings are described in [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md). Photo and licence rules live next to the assets: `public/photos/README.md`, `public/assets/boards/README.md`, `public/assets/batteries/README.md`.
