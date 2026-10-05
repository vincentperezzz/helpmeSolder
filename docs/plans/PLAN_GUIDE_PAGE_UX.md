# Plan: guide page UX fixes

**Status:** done. Implemented in commit `72afe5b` ("Guide page UX: fix overflow and scroll trap, add solder checklist, plain wording").

Found while reviewing a real guide page (ESP32 + buzzer) at 753px width. Five agents, disjoint files.

| Agent | Fixes | Owns |
| --- | --- | --- |
| A | Diagram overflows sideways; diagram traps page scrolling (wheel + touch); tiny diagram text; cryptic/jargon control labels and caption | `src/components/WokwiDiagram.tsx`, `src/components/wokwi/useDiagramViewport.ts`, `src/components/wokwi/labels.ts`, `src/components/wokwi/constants.ts`, diagram rules in `src/app/globals.css` |
| B | No plain "what to solder where" list; no tools/basics; steps can contradict diagram; no text alternative to the diagram | new `src/lib/guides/solder-plan.ts` (+ test), `src/components/SolderChecklist.tsx`, `src/components/ToolsList.tsx`, `src/lib/mcp/tools.ts` (descriptions/instructions only) |
| C | Page order for beginners (parts, tools, checklist, steps before the picture on small screens), warnings never shown, jargon headings, credits line, grid overflow | `src/app/guides/[id]/page.tsx`, `src/components/GuideWorkspace.tsx` |
| D | Developer jargon in part text ("Wokwi MIT visual", "lookalike"), ambiguous buzzer wording, hover-only affordances | `src/lib/catalog/modules.ts`, `passives.ts`, `boards.ts`, `src/components/PrepParts.tsx`, `src/lib/catalog/part-media.ts` |
| E | Wires drawn straight across the board body | `src/components/wokwi/routing.ts`, `geometry.ts`, `layout.ts`, `useWireMeasure.ts` (+ tests for pure functions) |

Contracts:
- `SolderChecklist({ guide })` and `ToolsList({ guide })` already exist as stubs; B replaces their bodies, C renders them. Both take `{ guide: Guide }`, are safe to render in a server component tree (B decides if they are client components) and must render nothing harmful for empty guides.
- Attribution: D removes "Wokwi MIT visual" from part descriptions; C adds a small credits line in the page footer: "Part drawings use the MIT-licensed Wokwi Elements." (keeps the MIT notice).
- Do NOT change the USB / VIN power wiring logic: open PR #4 (cursor/pico-usb-c-power-919c) edits it. B explains power in plain words in the checklist instead.

Rules for all: do not commit; run `npm run lint` and `npx tsc --noEmit`; vitest via
`"C:/Users/bnext01/AppData/Local/ms-playwright-go/1.57.0/node.exe" node_modules/vitest/vitest.mjs run` (default PATH node crashes);
do not run `next build` (the lead builds once). Plain words for non-technical readers, no em dashes.
