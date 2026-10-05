# HelpmeSolder

Step-by-step soldering and wiring guides, written by your AI assistant.

HelpmeSolder is a hosted [MCP](https://modelcontextprotocol.io) server. Add it to Claude, ChatGPT, Cursor, Codex or Antigravity, describe what you want to build, and the assistant uses the server's tools to assemble a beginner-friendly guide: parts list, wiring diagram, solder checklist and plain-language steps. You get a private link to the finished guide. The assistant plans the project; HelpmeSolder checks the pins against a trusted part catalog, so the diagram never shows invented connections. It is not a chat model and not a circuit simulator.

## Features

- **Hosted MCP server** at `/mcp` (Streamable HTTP). Nothing to install.
- **Tools** (see `src/lib/mcp/tools.ts`): `create_guide`, `ask_power_source`, `ask_sensor`, `set_power_source`, `add_part`, `add_connection`, `set_steps`, `get_guide`, `get_guide_link`, `list_catalog`, `search_catalog`, `get_part_details`, `request_part`, `validate_guide`.
- **Guide page** at a secret, unindexed URL with an interactive wiring diagram (zoom, wire follow-along, colour-coded wires).
- **Solder checklist** that lists what to connect where, plus a tools list for beginners.
- **Breadboard view** with real jumper holes and power rails, next to the direct-wire layout.
- **Power-source preview**: USB, power bank, battery holders and cells, barrel supplies, drawn on the diagram.
- **Part photos and drawings** with attribution, and detailed identify / watch-out notes per part.
- **Validation** that blocks bad pins and unsafe voltage or logic-level combinations and suggests alternatives.
- **Auto-delete**: guides that are not opened or edited for 30 days are removed (configurable).
- **Anonymous analytics** (daily one-way hash, no IP, no cookie, honours Do Not Track) and an unlisted **admin dashboard** for counts, requested parts, catalog searches and asset coverage.

## Quick start (users)

1. Open the live site, <https://helpmesolder.vercel.app>, and go to the setup section on the home page for copy-paste instructions per client.
2. Add this MCP URL to your AI client:

   ```
   https://helpmesolder.vercel.app/mcp
   ```

3. Ask for a project, for example "help me wire an ESP32 to a buzzer", and open the link the assistant gives you.

## Quick start (developers)

Requires Node.js 20.9 or newer and a Supabase project.

```bash
npm install
cp .env.example .env.local      # fill in the Supabase values
npm run dev                     # http://localhost:3000
```

| Command | Purpose |
| --- | --- |
| `npm test` | Unit and route tests (Vitest) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |
| `npm run seed:recipes` | Create the demo guides through a running API |

Apply the SQL files in `supabase/migrations/` in order. Environment variables, deployment and troubleshooting are in [docs/guides](docs/guides/DEPLOYMENT.md).

## Project structure

```
src/
  app/                  Next.js App Router: home page, /guides/[id], /mcp, /api/*, /admin
  components/           UI: guide workspace, wiring diagram (wokwi/), parts list, setup guide
  lib/
    catalog/            Part catalog: boards, modules, passives, batteries, photos and drawings
    guides/             Guide repository, validator rules, solder plan, power preview, retention
    mcp/                MCP tool definitions and server wiring
    admin/              Admin dashboard data, sessions, password handling
    api/                API auth, rate limiting, HTTP helpers
    analytics/          Anonymous daily visitor counts
    requests/           Missing-part requests and catalog search logging
supabase/migrations/    SQL migrations (guides, RLS, admin settings, analytics, requests)
public/
  photos/               Part photos and thumbnails
  assets/               Board, module and battery drawings with licences
mcp/                    Legacy local stdio MCP server (development only)
scripts/                Seed and art-generation scripts
docs/                   Architecture, guides and plans (index: docs/README.md)
```

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase Postgres, the official MCP TypeScript SDK, zod, [`@wokwi/elements`](https://github.com/wokwi/wokwi-elements) for part rendering, Vitest and ESLint. Hosted on Vercel, with a daily cron for cleanup.

## The part catalog

Every board, module, passive, battery and power supply an assistant can use comes from the part catalog: pin definitions, electrical limits, variants, look-alikes, and the photo or drawing shown in the guide. Assistants search it through the MCP tools and can ask for missing parts with `request_part`; those requests show up in the admin dashboard. For where the catalog lives and how it is structured, see [docs/architecture](docs/architecture/ARCHITECTURE.md).

## Documentation

All documentation is indexed in [docs/README.md](docs/README.md): [architecture](docs/architecture/ARCHITECTURE.md), [deployment and environment variables](docs/guides/DEPLOYMENT.md), [development notes](docs/guides/DEVELOPMENT.md), [plans](docs/plans/BUILD_PLAN.md), [Supabase migrations](supabase/README.md) and the [legacy stdio server](mcp/README.md).

## Contributing

Issues and pull requests are welcome. Run `npm test`, `npm run lint` and `npx tsc --noEmit` before opening a PR. Next.js 16 differs from earlier versions; read the guides in `node_modules/next/dist/docs/` before changing Next.js code (see [AGENTS.md](AGENTS.md)). Never commit `.env.local` or any secret. To suggest a missing part, ask your assistant to call `request_part`, or open an issue.

## Licence and attribution

- No licence file has been added to this repository yet; until one is, all rights are reserved by the author.
- Part renderings use [Wokwi Elements](https://github.com/wokwi/wokwi-elements), MIT licensed.
- Some board drawings come from third-party MIT projects; their licence texts are in `public/assets/boards/`.
- Part photos come from Wikimedia Commons, Wikipedia and Openverse, shown with attribution on the guide page and listed in `public/photos/README.md`.
- The original illustrations and SVG drawings made for this project are released as CC0.
