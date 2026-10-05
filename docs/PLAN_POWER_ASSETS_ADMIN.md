# Plan: power rendering, part images, parts list, admin page, print

Branch `feat/power-assets-admin` (stacked on `fix/guide-page-ux`).

| Agent | Task | Owns |
| --- | --- | --- |
| G1 | Original SVG thumbnails: sensors | new `public/photos/<hint>.svg` for hc-sr04, soil-moisture-capacitive, ntc-temperature, flame-sensor, gas-sensor, heart-beat, big-sound, small-sound, ir-receiver, tilt-switch |
| G2 | Original SVG thumbnails: displays, LEDs, output | buzzer-active, ili9341, neopixel, neopixel-matrix, led-ring, led-bar-graph, 7segment |
| G3 | Original SVG thumbnails: inputs and other; repair broken SVGs | hx711, analog-joystick, ky-040, ds1307, slide-switch, slide-potentiometer; fix/validate every existing `public/**/*.svg` (battery-9v.svg has an invalid character) |
| R | Parts list redesign, thumbnail registration, placeholder | `src/components/PrepParts.tsx`, `src/lib/catalog/part-media.ts`, `src/components/wokwi/SkeletonPart.tsx` |
| P | Diagram engine: USB cable into the board port, wire/label overlaps, image-drag bug, small text | `src/components/wokwi/*` (except SkeletonPart.tsx), `src/components/WokwiDiagram.tsx`, `src/components/BatteryAssets.tsx` |
| T | Power-source selector on the guide page | `src/components/GuideWorkspace.tsx`, new `src/components/PowerSelector.tsx` |
| M | Admin dashboard (counts only) | `src/app/admin/**`, `src/lib/admin/**`, `.env.example` |
| PR | Print this guide | `src/app/guides/[id]/PrintButton.tsx`, new `src/app/guides/[id]/print.css` |

Image style: viewBox `0 0 320 240`, transparent background, flat vector, top-down or three-quarter view of the real part, soft ground shadow, palette ink `#121a20`, copper `#b65c2e`, flux `#1f5a56`, paper `#eef3f0`, plus realistic part colours (blue/green PCB, silver, black). Original drawings only (no tracing copyrighted photos). Include `<title>`, `role="img"`, `aria-label`. No scripts, no external refs, valid XML, under ~12KB.
Check every drawing by rendering: `sharp` is installed. Render to PNG in the scratchpad dir and view the PNG with the Read tool; fix and re-render (max 3 rounds per image).

Rules for all: do not commit; do not run `next build`; run `npm run lint` and `npx tsc --noEmit` if you touched TS/TSX; vitest via `"C:/Users/bnext01/AppData/Local/ms-playwright-go/1.57.0/node.exe" node_modules/vitest/vitest.mjs run` (default PATH node crashes). Plain words for readers, no em dashes.

## Follow-up round: wire colours, follow-along, hover details, battery layout

Shared API already added by the lead in `src/components/wokwi/labels.ts`:
`wireRole(label)`, `SIGNAL_WIRE_PALETTE`, `assignWireColors(labels: string[]): string[]` (power red, ground black, each signal wire its own colour). The diagram and `solder-plan.ts` must both use `assignWireColors` (index-aligned with the connection labels) so colours always match; `wireColor()` stays only for old callers.

Contract for the new WokwiDiagram optional props (agent D implements, agent K passes them from GuideWorkspace):
- `focusedWireIds?: string[] | null` null = show all wires normally; otherwise those wires are drawn at full strength and the others are dimmed (or hidden when `hideUnfocused`)
- `hideUnfocused?: boolean`
- `hoveredWireId?: string | null` external highlight (from checklist hover)
- `onHoverWire?: (id: string | null) => void`, `onSelectWire?: (id: string | null) => void`
Wire ids are the guide connection ids; checklist items already use the same ids (`WireItem.id`).
