# Supabase migrations

Apply these by hand in the Supabase dashboard: open **SQL Editor**, paste the
file contents, and click **Run**. Apply them in order.

| File | What it does | When |
| --- | --- | --- |
| `migrations/0001_guide_retention.sql` | Adds `guides.last_accessed_at` (default `now()`) and an index on it. The app updates it when a guide is opened (at most once per 24h) or edited, and the daily cron deletes guides older than `GUIDE_RETENTION_DAYS`. Idempotent. | Apply now. The app works without it (retention then falls back to `updated_at`), but "opened" is only tracked once it exists. |
| `migrations/0002_lock_down_rls.sql` | Enables row level security on `public.guides` and revokes all access from the `anon` and `authenticated` roles, so only the server (service role key) can read or write. | **Only after** confirming `SUPABASE_SERVICE_ROLE_KEY` is set and working in production. If the app is using the anon key, it will break. |

The second file includes a commented query to list existing policies.

## Environment

- `GUIDE_RETENTION_DAYS` (default 30)
- `CRON_SECRET` (required for `/api/cron/cleanup`; set it in Vercel, which sends it as a Bearer token to the cron job)

## Admin password settings

| File | What it does | When |
| --- | --- | --- |
| `migrations/0003_admin_settings.sql` | Creates `public.admin_settings` (one row, `id = 1`) that holds the scrypt hash of the `/admin` password. Row level security is on and `anon` and `authenticated` have no access, so only the service role key can read or write it. Idempotent. | Apply before using **Settings** in `/admin` to change the password. Without it the dashboard still works, and the settings page tells you the migration is missing. |

Which password is used, in order:

1. The hash saved in `admin_settings`, if a row exists.
2. `ADMIN_PASSWORD`, if set.
3. The built-in default `admin`, unless `ADMIN_DISABLE_DEFAULT_PASSWORD=true` (then `/admin` returns 404).

Signing in with the built-in default only opens the settings page. The dashboard
stays locked until a new password is chosen.

**Forgot the password?** Open the Supabase table editor, open `admin_settings`
and delete the row. The dashboard then falls back to `ADMIN_PASSWORD`, or to the
default, and asks for a new password again.

## Anonymous usage counts

| File | What it does | When |
| --- | --- | --- |
| `migrations/0004_daily_clients.sql` | Creates `public.daily_clients` (`day`, `kind`, `client_hash`), one row per distinct client per UTC day. `kind` is `visitor` (opened the home page or a guide) or `creator` (created a guide). Row level security is on and `anon` and `authenticated` have no access. Idempotent. | Apply before the admin dashboard can show user counts. Without it the app works normally and counting is skipped quietly. |

What is stored: the day, the kind, and a one-way hash. The hash is built from
a key that changes every day plus the IP and user agent, so it cannot be
reversed and cannot link the same person across days. No IP address, no user
agent, no cookie. Requests with `DNT: 1` or `Sec-GPC: 1`, and obvious bots, are
not counted.

Retention: the daily cleanup cron deletes rows older than 90 days.

Environment: `ANALYTICS_SECRET` (optional). It seeds the daily key. If unset,
`SUPABASE_SERVICE_ROLE_KEY` is used. Neither is ever logged or stored.

## Parts requested but not in the catalog

| File | What it does | When |
| --- | --- | --- |
| `migrations/0005_part_requests.sql` | Creates `public.part_requests` (one row per normalized part name, with `demand`, `calls`, `status`, admin alias `mapped_catalog_id`), `public.part_request_hits` (dedupe) and the function `public.record_part_request`. Row level security is on, `anon` and `authenticated` have no access, and only `service_role` can run the function. Idempotent. | Apply before the admin can list missing parts. Without it the app works normally and recording is skipped quietly (one warning, then a 10 minute pause). |

What is recorded: the part name the AI asked for (max 80 characters), an
optional short reason (max 200), up to 40 example pins, and a count. `demand`
is the number of distinct anonymous clients per day who asked; it uses the same
one-way daily hash as the usage counts. No IP address, no user agent, no
cookie. Requests with `DNT: 1` or `Sec-GPC: 1`, and obvious bots, are not
recorded. The tool text tells the AI not to put personal information in the
reason.

Retention: the daily cleanup cron deletes `part_request_hits` older than 180
days. `part_requests` rows are kept until the admin removes them.

## Catalog searches by AI assistants

| File | What it does | When |
| --- | --- | --- |
| `migrations/0006_catalog_searches.sql` | Creates `public.catalog_searches` (one row per normalized search text, with `demand`, `searches`, `no_match_searches`, the latest result count and best match, and admin `status` / `admin_note`), `public.catalog_search_hits` (dedupe) and the function `public.record_catalog_search`. Row level security is on, `anon` and `authenticated` have no access, and only `service_role` can run the function. Idempotent. | Apply before the admin can list what assistants search for. Without it the app works normally and recording is skipped quietly (one warning, then a 10 minute pause). |

What is recorded: the text an assistant passed to the MCP `search_catalog`
tool, or the `intent` text of `ask_sensor` (max 80 characters, control
characters removed), how many catalog parts matched, the best match and its
score, and a count. `demand` is the number of distinct anonymous clients per
day who searched; it uses the same one-way daily hash as the usage counts. No
IP address, no user agent, no cookie. Requests with `DNT: 1` or `Sec-GPC: 1`,
and obvious bots, are not recorded. Empty text is not recorded.

Retention: the daily cleanup cron deletes `catalog_search_hits` older than 180
days. `catalog_searches` rows are kept until the admin removes them.
