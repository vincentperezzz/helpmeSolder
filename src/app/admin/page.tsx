import { loadGuideStats, MAX_ROWS } from "@/lib/admin/data";
import type { GuideStats } from "@/lib/admin/stats";
import { countNewRequests } from "@/lib/admin/requests";
import { hasAnyActivity } from "@/lib/admin/chart";
import { loadUserStats, type KindTotals, type UserLoad } from "@/lib/admin/users";
import { VisitorsChart } from "./_components/VisitorsChart";
import { getRetentionDays } from "@/lib/guides/retention";
import { loginAction } from "./actions";
import { guardAdmin } from "./_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "./_components/meta";
import { AdminShell } from "./_components/shell";
import { NoAccess, NotTracking, TrackingOn } from "./_components/status";
import Link from "next/link";
import { Section, Tile, Tiles } from "./_components/ui";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("Admin");

type AdminPageProps = {
  searchParams: Promise<{ error?: string; changed?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const guard = await guardAdmin("dashboard", { loginInline: true });
  if (guard.kind === "unavailable") {
    return (
      <main className="mx-auto w-full max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Admin sign in</h1>
        <p role="alert" className="mt-4 text-sm text-warn-ink">
          {UNAVAILABLE_TEXT}
        </p>
      </main>
    );
  }
  const { error, changed } = await searchParams;
  if (guard.kind === "login") return <LoginView error={error} />;

  const [users, guides, newRequests] = await Promise.all([
    loadUserStats(),
    loadGuides(),
    countNewRequests(),
  ]);
  return (
    <AdminShell session={guard.session} active="overview" title="Admin overview">
      {changed === "1" ? (
        <p role="status" className="mb-4 rounded-md border border-line bg-white/60 p-3 text-sm text-ink">
          Password changed. Other sessions have been signed out.
        </p>
      ) : null}
      <p className="rounded-md border border-line bg-white/60 p-3 text-sm text-ink-soft">
        What this page shows: counts only. How many people visit, how many guides exist, which
        whether guides pass the safety checks, which parts people asked for that the catalog does
        not have, and which parts and images the site supports. No guide links, titles or content appear here.
      </p>

      <HeadlineTiles users={users} />

      <Section title="Users">
        <UsersBlock users={users} />
      </Section>

      <Section title="Requests">
        <Link
          href="/admin/requests"
          className="block rounded-md border border-line bg-white/60 p-3 hover:bg-paper-deep sm:max-w-xs"
        >
          <p className="text-xs text-mute">Parts requested, not started</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {newRequests.kind === "ok"
              ? newRequests.count
              : newRequests.kind === "missing"
                ? "Not tracking"
                : "No access"}
          </p>
          <p className="mt-1 text-xs text-mute">Open the Requests tab</p>
        </Link>
      </Section>

      <Section title="Guides at a glance">
        {guides.stats ? (
          <div className="space-y-6">
            {guides.capped ? (
              <p className="text-sm text-warn-ink">
                Only the first {MAX_ROWS.toLocaleString("en-US")} guides were counted. Numbers
                below are partial.
              </p>
            ) : null}
            <Tiles>
              <Tile label="Total guides" value={guides.stats.total} />
              <Tile label="Created today (UTC)" value={guides.stats.created.today} />
              <Tile label="Last 7 days" value={guides.stats.created.last7} />
              <Tile label="Last 30 days" value={guides.stats.created.last30} />
            </Tiles>
            <Tiles>
              <Tile label="Pass all checks" value={guides.stats.validation.ok} />
              <Tile label="With warnings" value={guides.stats.validation.warnings} />
              <Tile label="Blocked" value={guides.stats.validation.blocked} hint="Has an error" />
            </Tiles>
          </div>
        ) : (
          <p role="alert" className="text-sm text-warn-ink">
            Could not read guides from the database. Check the Supabase settings.
          </p>
        )}
      </Section>

      <Section title={`Retention (guides are deleted after ${getRetentionDays()} days unopened)`}>
        {guides.stats?.retention ? (
          <Tiles>
            <Tile label="Never opened again" value={guides.stats.retention.neverReopened} />
            <Tile label="Not opened for 14+ days" value={guides.stats.retention.idle14} />
            <Tile label="Expiring within 7 days" value={guides.stats.retention.expiringSoon} />
          </Tiles>
        ) : guides.stats ? (
          <p className="text-sm text-warn-ink">
            Run supabase/migrations/0001_guide_retention.sql to track this.
          </p>
        ) : (
          <p className="text-sm text-mute">Not available while guides cannot be read.</p>
        )}
      </Section>
    </AdminShell>
  );
}

async function loadGuides(): Promise<{ stats: GuideStats | null; capped: boolean }> {
  try {
    const result = await loadGuideStats();
    return { stats: result.stats, capped: result.capped };
  } catch {
    return { stats: null, capped: false };
  }
}

function LoginView({ error }: { error?: string }) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Admin sign in</h1>
      <form action={loginAction} className="mt-6 space-y-3">
        <label className="block text-sm font-medium text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-ink"
        />
        {error === "wrong" ? (
          <p role="alert" className="text-sm text-warn-ink">
            That password is not right.
          </p>
        ) : null}
        {error === "locked" ? (
          <p role="alert" className="text-sm text-warn-ink">
            Too many tries. Wait 15 minutes and try again.
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink-soft"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

function HeadlineTiles({ users }: { users: UserLoad }) {
  const ok = users.kind === "ok";
  const none = users.kind === "denied" ? "No access" : "Not tracking";
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <Tile
        big
        label="Visitors today (UTC)"
        value={ok ? users.stats.visitors.today : none}
      />
      <Tile
        big
        label="Guide creators today (UTC)"
        value={ok ? users.stats.creators.today : none}
      />
    </div>
  );
}

function KindTiles({ label, totals }: { label: string; totals: KindTotals }) {
  return (
    <Tiles>
      <Tile label={`${label} today`} value={totals.today} />
      <Tile label={`${label} yesterday`} value={totals.yesterday} />
      <Tile label={`${label}, last 7 days`} value={totals.last7} />
      <Tile label={`${label}, last 30 days`} value={totals.last30} />
    </Tiles>
  );
}

function UsersBlock({ users }: { users: UserLoad }) {
  if (users.kind === "missing") {
    return <NotTracking migration="0004_daily_clients.sql" />;
  }
  if (users.kind === "denied") {
    return <NoAccess />;
  }
  if (users.kind === "error") {
    return (
      <p role="alert" className="text-sm text-warn-ink">
        Could not read visitor counts from the database. Try again in a moment.
      </p>
    );
  }
  const { stats } = users;
  return (
    <div className="space-y-6">
      <TrackingOn>
        {hasAnyActivity(stats.series)
          ? "Counting visitors and guide creators."
          : "The table is ready and no visits have been recorded yet."}
      </TrackingOn>
      {users.capped ? (
        <p className="text-sm text-warn-ink">Too many rows to read. Numbers below are partial.</p>
      ) : null}
      <KindTiles label="Visitors" totals={stats.visitors} />
      <KindTiles label="Creators" totals={stats.creators} />
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Visitors per day</h3>
        <VisitorsChart series={stats.series} />
        {hasAnyActivity(stats.series) ? null : (
          <p className="mt-2 text-sm text-ink-soft">No visits recorded yet.</p>
        )}
        <p className="mt-3 text-sm text-mute">
          Counts are anonymous. A person who visits on three different days counts three times
          because the site cannot recognise people from one day to the next. Nothing is stored
          that identifies anyone.
        </p>
      </div>
    </div>
  );
}
