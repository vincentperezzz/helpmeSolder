# Review Fix Plan

**Status:** done. Implemented in commit `a356ed9` ("Harden API, secret URLs, and validator; split diagram; add tests").

Source: project review. Each task has one owner agent and a disjoint file set.
Rule for all agents: read the relevant guide in `node_modules/next/dist/docs/` before touching Next.js code (see AGENTS.md). Do not commit. Run `npm run lint` and `npx tsc --noEmit` before reporting. Report: files changed, decisions, follow-ups.

## Wave 1 (parallel, no shared files)

| ID | Concern(s) | Owns | Must not touch |
| --- | --- | --- | --- |
| A | #1 fail-open auth, #2 constant-time compare, #3 zod -> 400s, #5 rate limiting | `src/lib/api/**`, `src/app/api/**` | validator, catalog, components, layout |
| B | #4 secret-URL hardening (noindex, no-referrer, cache headers) | `src/app/layout.tsx`, `src/app/guides/**`, `next.config.ts` | `src/app/api/**`, components |
| C | #6 split `WokwiDiagram.tsx` (1,800 lines) | `src/components/WokwiDiagram.tsx` + new `src/components/wokwi/**` | everything else |
| D | #8 electrical safety rules (logic level / voltage / LiPo) | `src/lib/guides/validator.ts`, `src/lib/catalog/{types,boards,modules,batteries,passives}.ts` | api, components |
| F | #9 Next 16 verification (read-only audit) | nothing (report only) | everything |

## Wave 2 (after D lands)

| ID | Concern | Owns |
| --- | --- | --- |
| E | #7 tests: validator unit tests (incl. D's new rules), auth + route error handling | `package.json` (test script/devDeps), `vitest.config.ts`, `**/*.test.ts` |

## Handoffs
- A -> E: auth/rate-limit behaviour is specified in A's report; E tests it.
- D -> E: D lists each new validation rule with a failing and passing example.
- F -> A/B/C: F's report flags any Next 16 API drift; the lead applies fixes to the owning area.
- C is behaviour-preserving: no visual change, same exports.
