# Plan: schematic view (circuit diagram with real symbols)

Goal: let a beginner flip between the picture of the real parts (`WokwiDiagram`) and the same circuit drawn as a textbook schematic. The two views stay in sync, so the user learns "this resistor on the board is this zigzag on the schematic" and stops depending on the tool alone.

Non-goals: no new schema, no new API, no editing from the schematic, no per-module custom symbols for the whole catalog, no general-purpose wire router.

## Why this is cheap

- A schematic is a second rendering of data we already have: `Guide.parts` + `Guide.connections` (pin to pin) and `CatalogPin.kinds`.
- The toggle, hover/focus and step-follow plumbing already exist in `GuideWorkspace.tsx` (`focusId`, `hoverId`, `focusedWireIds`, `hideOthers`, `followMode`) and `src/components/wokwi/focus.ts`.
- Passives are explicit catalog entries (`passives.ts`: resistor 220/1k/10k, LED red/green, potentiometer, pushbutton, USB wall, power bank, breadboard), so the symbol set is small.

## Design decisions

1. **Boards and modules are labeled blocks, not custom symbols.** Real schematics draw ICs and modules as rectangles with named pins. Generate each block from `CatalogPart.pins`. Pin kinds drive which side a pin sits on: power top, ground bottom, signals left/right.
2. **Real symbols only for the primitives**: resistor, LED, potentiometer, pushbutton/switch, battery/cell, USB/DC supply, ground, VCC/3V3/5V rail labels, capacitor/diode (ready for catalog growth). About 10 SVG symbols.
3. **Nets, not spaghetti.** Group connections by net (union-find over pins joined by a connection). Draw power and ground as rail symbols (VCC/GND flags) at each pin instead of long wires. Draw signal nets as short orthogonal wires. This is what makes small schematics readable and keeps the layout simple.
4. **Layout is a fixed 3-column scheme**: power source left, board center, modules/passives right. Parts on the same bus (I2C, SPI) sit adjacent. Series passives (e.g. resistor between GPIO and LED) are placed inline between the board pin and the target part.
5. **Both views share ids.** Schematic elements carry `data-part-id` / `data-connection-id` identical to the Wokwi view, so focus, hover and "follow step" work with no new state.
6. **Teaching layer**: hover or tap a symbol shows plain-words text ("Resistor: limits current so the LED does not burn out") and a small glossary of symbols used in this guide.
7. **Beginner default stays the real-parts picture.** Schematic is opt-in; remember the choice per guide in localStorage like `readLayout`.

## Phases

### Phase 1: static schematic + toggle (core value)

| Agent | Task | Owns |
| --- | --- | --- |
| A | Symbol library: pure SVG components with pin anchor points, one per primitive; export a `SYMBOLS` map keyed by catalog id prefix, plus the block-symbol generator from `CatalogPin[]`. | new `src/components/schematic/symbols/*` |
| B | Net + layout engine (pure, no React): `buildNets(guide)`, `layoutSchematic(guide) -> { parts, nets, rails, width, height }`, orthogonal wire routing. Unit tests for nets, layout determinism, series-passive placement. | new `src/lib/schematic/*` (+ tests) |
| C | `SchematicDiagram({ guide, focusedWireIds, hoveredWireId, onHoverWire, onSelectWire, ... })` renders B's layout with A's symbols; colors by pin kind reuse the `pinFill` palette in `WiringDiagram.tsx`; viewport reuse via `useDiagramViewport`. | new `src/components/schematic/SchematicDiagram.tsx` |
| D | Integration: a "Real parts / Schematic" segmented control next to the Breadboard switch; swap `WokwiDiagram` for `SchematicDiagram` in the canvas frame; persist choice per guide. | `src/components/GuideWorkspace.tsx`, new `src/components/ViewToggle.tsx`, `readView`/`writeView` beside `readLayout` |

Contracts:
- `SchematicDiagram` takes the same focus/hover props as `WokwiDiagram` (names above) and renders nothing harmful for an empty guide.
- B depends on A only for symbol pin offsets; agree on `SymbolSpec = { id, width, height, pins: Record<pinId, {x, y, side}> }` first (A writes this type file before anything else, B and C import it).
- Do not touch `src/components/wokwi/*`, power-source logic or `validator.ts`.
- Breadboard-view toggle keeps working; the schematic ignores the breadboard (it is never drawn in a schematic). The `passive.breadboard.half` part is skipped, and the wires through it are collapsed to direct nets.

Done when: ESP32 + LED + resistor, ESP32 + I2C OLED, and a battery-powered guide all render a correct, non-overlapping schematic; toggling does not lose focus/hover state.

### Phase 2: step sync + teaching layer

- Highlight in the schematic whatever the current step touches (reuse `focusedWireIds`; extend step to net mapping only if `solder-plan.ts` does not already give it).
- Hover/tap tooltip with plain-words symbol meaning; "Symbols in this guide" legend (only the symbols actually used).
- Cross-highlight: hovering a part in the picture pulses its symbol and vice versa.
- Reduced-motion respected; focus rings and aria labels on every symbol ("Resistor R1, 220 ohms, connected to GPIO 4 and LED anode").

### Phase 3: polish (cap the budget)

- Mobile layout (stack columns, pinch zoom through the existing viewport hook).
- Print: an "Include schematic" choice in the print flow (`src/app/guides/[id]/PrintButton.tsx`), plus print CSS in `guide.css` so the schematic fits one page.
- Capacitor/diode/transistor symbols as the catalog grows.
- Optional custom symbols for the 5 most-used modules only if analytics (admin `searches`) justify it.

## Risks

| Risk | Mitigation |
| --- | --- |
| Auto-layout looks messy on bigger circuits | Rail symbols (VCC/GND flags) remove most crossings; cap Phase 1 at guides with <= 8 parts and fall back to a "too complex, use the picture view" notice |
| Resistor value text and pin labels collide | Fixed label slots in the symbol spec; unit tests on layout bounds like `bounds.test.ts` |
| Guides with no board or partial connections | Net builder tolerates dangling pins; render unconnected pins with an open-circle terminal |
| Another session edits `GuideWorkspace.tsx` | Keep the integration diff to the toggle + one conditional render (Agent D, last, after others merge) |
| Breadboard-routed connections confuse net building | Treat breadboard rails/columns as transparent nodes in `buildNets` and test it explicitly |

## Test plan

- Unit: `buildNets` (series, parallel, shared ground, breadboard pass-through), `layoutSchematic` (no overlapping bounding boxes, deterministic), symbol pin anchors in range.
- Component: render smoke test for three recipe guides from `recipes.ts`.
- Manual (run skill): toggle on the guide page at desktop and 753px, step follow on/off, hover cross-highlight.
- Gates: `npm run lint`, `npx tsc --noEmit`, vitest via the Playwright node path used in the other plan docs. Do not run `next build` from agents; the lead builds once.

## Cost / sequencing

Phase 1 is the bulk (~150-300k tokens of agent work), Phase 2 ~100-200k. Run A and B in parallel, C after both, D last. Route A, B tests and C through cheaper subagents (`implement-it`); the lead reviews the layout visually and owns the final integration.

Decisions (confirmed):
1. Toggle sits next to the Breadboard switch.
2. Phase 1 covers MCP-generated guides too. Unknown parts fall back to labeled blocks.
3. Printing is the end user's choice: the print flow (`PrintButton.tsx`) asks whether to include the schematic. Default off, choice remembered per guide, and the solder sheet prints fine without it.
