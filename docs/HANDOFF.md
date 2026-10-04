# Handoff

## Status

Vision frozen. Execute build. Do not reopen product discovery.

## Locked decisions

- Integration: MCP tool for Cursor/Claude (we do NOT host the LLM)
- Guide page: Prep/parts → full wiring diagram → structured steps/notes
- Delivery: chat says “open this link”; web is canonical
- Visuals: photo boards + skeleton modules (catalog SVG)
- Boards v1: ESP32, Pico, Uno/Nano, ESP8266 + modules for buzzer, LCD, soil
- Power: LLM sets battery/usb_wall; else API tells LLM to ask
- Validation: hard block + `alternatives[]`
- Auth v1: secret `/guides/[id]` only
- Infra: Vercel Hobby + Supabase Postgres (org `perez`)
- First slice: Next.js + API + catalog + validator + SVG renderer + MCP + 3 recipes

## Repo slug

`helpmesolder` — GitHub `vincentperezzz/helpmeSolder`

## Start order

1. Phase 0: scaffold, health, guide shell, Vercel + Supabase projects, push main
2. Phase 1: catalog + guide API + schema + validator
3. Phase 2: SVG renderer + guide page rendering
4. Phase 3: MCP server tools wired to API
5. Phase 4: 3 canned recipes end-to-end

## Docs map

- `docs/PRODUCT.md` — what we ship
- `docs/ARCHITECTURE.md` — how it fits
- `docs/CONTEXT.md` — one-screen freeze
- `BUILD_PLAN.md` — phased execution checklist
