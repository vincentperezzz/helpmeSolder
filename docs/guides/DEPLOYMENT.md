# Deployment and environment variables

HelpmeSolder runs on Vercel (Next.js) with Supabase Postgres. This page lists every environment variable the code reads. The source of truth is [`.env.example`](../../.env.example); each name below was checked against `process.env` usage in `src/`.

## 1. Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run the files in `supabase/migrations/` in order (`0001` to `0006`). Details, timing and the safe order for the lock-down migration are in [`supabase/README.md`](../../supabase/README.md).
3. Copy the project URL, the anon (publishable) key and the service role key from **Project Settings > API**.

Run `0002_lock_down_rls.sql` only after `SUPABASE_SERVICE_ROLE_KEY` is set and working in production, otherwise the app loses access.

## 2. Vercel

Import the repository, then set the variables below under **Project Settings > Environment Variables**. `vercel.json` registers the daily cleanup cron (`/api/cron/cleanup`, 03:00 UTC).

### Required

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side reads and writes. Never exposed to the browser. Also the fallback secret for the anonymous visitor hash. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key. `SUPABASE_ANON_KEY` is accepted as a server-only alias. |
| `ALLOW_PUBLIC_API` or `MCP_API_KEY` | One of the two is required in production, otherwise API and `/mcp` requests get `503`. See below. |
| `CRON_SECRET` | Long random string. Vercel sends it as `Authorization: Bearer <value>` to the cleanup cron. Without it `/api/cron/cleanup` returns `503` and nothing is deleted. |

### Optional

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | request origin | Canonical base URL used in guide links. A localhost value is ignored when the request comes from a real host. |
| `GUIDE_RETENTION_DAYS` | `30` | Days a guide may go unopened and unedited before the daily cleanup deletes it. |
| `ADMIN_PASSWORD` | none | Password for the unlisted `/admin` dashboard. |
| `ADMIN_DISABLE_DEFAULT_PASSWORD` | unset | Set to `true` to disable the built-in default password `admin`. If no password is saved and `ADMIN_PASSWORD` is empty, `/admin` then returns `404`. |
| `ANALYTICS_SECRET` | `SUPABASE_SERVICE_ROLE_KEY` | Seeds the one-way daily hash behind the anonymous visitor and creator counts. |
| `MCP_API_KEY` | none | Bearer key for the API and `/mcp`. |

### API access modes

- `ALLOW_PUBLIC_API=true`: anyone may call the API and `/mcp`, subject to rate limits. This is what the public instance uses so users only need the URL.
- `MCP_API_KEY` set and public access off: callers must send `Authorization: Bearer <key>` or `x-api-key`.
- A key that is presented must always match, even when public access is on.
- Neither set: `503` in production; allowed with a warning in development.

### Admin password order

1. A password saved from `/admin/settings` (stored as a scrypt hash in `admin_settings`, migration `0003`).
2. `ADMIN_PASSWORD`.
3. The built-in default `admin`, which only opens the settings page until a new password is chosen.

Sessions last 8 hours and changing the password signs everyone out. If you forget it, delete the row in `admin_settings` (see `supabase/README.md`).

## 3. Verify

- `GET /api/health` returns OK.
- Open the site, then the setup section, and add `https://<your-host>/mcp` to an AI client.
- After the first cron run, expired guides are removed; privacy details of the anonymous counts are in `supabase/README.md`.
