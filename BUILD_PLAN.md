# Build Plan

Vision is frozen. Build in order. Do not reopen discovery.

## Phase 0 — Scaffold + infra

- [x] Next.js + TypeScript + Tailwind App Router
- [x] README + `.env.example`
- [x] `GET /api/health`
- [x] Empty `/guides/[id]` shell
- [x] Vercel project `helpmesolder`
- [x] Supabase project `helpmesolder` (org `perez`)
- [x] Push to private GitHub `main`

## Phase 1 — Catalog + guide API

- [x] `guides` table + RLS
- [x] Catalog: boards (ESP32, Pico, Uno, Nano, ESP8266)
- [x] Catalog: modules (buzzer, LCD I2C, soil)
- [x] Catalog: 3 recipes
- [x] Guide repository (create/get/update)
- [x] Validator with hard block + `alternatives[]`
- [x] API: catalog, create/get/patch guide, power, validate
- [x] Wire guide page to live guide data
- [ ] Env: `SUPABASE_SERVICE_ROLE_KEY` + `MCP_API_KEY` on Vercel
- [x] Smoke test create → open URL

## Phase 2 — Guide renderer

- [x] Prep/parts section from catalog
- [x] Catalog SVG skeleton renderer for boards/modules
- [x] Connection overlays for full wiring diagram
- [x] Steps + notes rendering
- [x] Photo board assets hooks (`photoHint`)

## Phase 3 — MCP server

- [ ] Thin MCP server package/process
- [ ] Tools: `create_guide`, `set_power_source`, `add_part`, `add_connection`, `set_steps`, `get_guide`, `list_catalog`, `validate_guide`
- [ ] Tools call Next.js API (not DB directly)
- [ ] Return secret guide URL from `create_guide`
- [ ] Cursor/Claude config docs

## Phase 4 — Canned recipes E2E

- [ ] Recipe: buzzer beep
- [ ] Recipe: I2C LCD text
- [ ] Recipe: soil moisture read
- [ ] Each recipe validates clean with power set
- [ ] Demo: chat plan → MCP writes → URL shows full guide

## Done when

A builder can plan one of the three recipes in Cursor/Claude, get a secret link, and see prep + wiring + steps without inventing pins.
