# Plan: guide retention + beginner onboarding

Shared contract (already in the tree): `src/lib/guides/retention.ts` exports
`getRetentionDays()` (default 30, env `GUIDE_RETENTION_DAYS`), `getExpiryDate(lastAccessedAt)`,
`retentionNotice()`. `Guide.last_accessed_at?: string | null` was added to `src/lib/catalog/types.ts`.

| Agent | Task | Owns (and nothing else) |
| --- | --- | --- |
| A | Retention backend: migration SQL, touch-on-access, daily cleanup cron, MCP/API messaging, tests | `supabase/**`, `src/lib/guides/repository.ts`, `src/app/api/cron/**`, `vercel.json`, `src/lib/mcp/tools.ts`, `src/app/api/guides/route.ts`, `.env.example`, new `*.test.ts` for these |
| B | Guide page expiry notice | `src/app/guides/**`, `src/components/GuideWorkspace.tsx` (only if needed) |
| C1 | Hero + metadata copy | `src/app/page.tsx` (hero text only), `src/app/layout.tsx` (metadata only) |
| C2 | Beginner-friendly setup section + homepage retention note | `src/components/HomeSections.tsx`, `src/components/SetupGuide.tsx`, `src/components/CopyBlock.tsx` |

Rules for all: do not commit; run `npm run lint` and `npx tsc --noEmit`; use
`"C:/Users/bnext01/AppData/Local/ms-playwright-go/1.57.0/node.exe"` as node for vitest/next
(default PATH node crashes). Do not run `next build` (the lead builds once at the end).
Migrations must be backward compatible: the app must keep working if the SQL has not been applied yet.
