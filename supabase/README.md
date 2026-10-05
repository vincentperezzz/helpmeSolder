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
