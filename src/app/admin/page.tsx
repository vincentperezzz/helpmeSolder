import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCatalogPart } from "@/lib/catalog";
import { getRetentionDays } from "@/lib/guides/retention";
import { buildCoverage, type CoverageRow } from "@/lib/admin/coverage";
import { MAX_ROWS, loadGuideStats } from "@/lib/admin/data";
import { authorizeArea } from "@/lib/admin/credential";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin/session";
import { loadAdminAuth } from "@/lib/admin/store";
import type { CountEntry, GuideStats } from "@/lib/admin/stats";
import { loginAction, logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | HelpmeSolder",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  referrer: "no-referrer",
};

const POWER_LABELS: Record<string, string> = {
  usb_wall: "USB wall",
  battery_9v: "9V battery",
  battery_2aa: "2xAA holder",
  battery_3aa: "3xAA holder",
  battery_18650: "18650 Li-ion",
  "not set": "Not set",
};

type AdminPageProps = {
  searchParams: Promise<{ error?: string; changed?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const auth = await loadAdminAuth();
  if (auth.kind === "disabled") notFound();
  if (auth.kind === "unavailable") {
    return (
      <main className="mx-auto w-full max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Admin sign in</h1>
        <p role="alert" className="mt-4 text-sm text-warn-ink">
          The saved password could not be checked right now. Try again in a moment.
        </p>
      </main>
    );
  }

  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const access = authorizeArea(readSessionToken(token, auth.key), "dashboard");
  if (access.kind === "settings") redirect("/admin/settings?notice=default");
  const { error, changed } = await searchParams;
  if (access.kind === "login") return <LoginView error={error} />;
  return <Dashboard changed={changed === "1"} />;
}

function Shell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-mute">HelpmeSolder</p>
          <h1 className="font-display text-2xl font-bold text-ink">Admin overview</h1>
        </div>
        {action}
      </header>
      {children}
    </main>
  );
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-line bg-white/60 p-3">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}

function Tiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

function BarList({
  entries,
  label,
  empty = "Nothing yet.",
}: {
  entries: { label: string; count: number }[];
  label: string;
  empty?: string;
}) {
  if (entries.length === 0) return <p className="text-sm text-mute">{empty}</p>;
  const max = Math.max(...entries.map((e) => e.count));
  return (
    <ul aria-label={label} className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 break-words text-ink">{entry.label}</span>
            <span className="shrink-0 tabular-nums text-mute">{entry.count}</span>
          </div>
          <div className="mt-1 h-2 rounded bg-paper-deep">
            <div
              className="h-2 rounded bg-flux"
              style={{ width: `${Math.max(2, (entry.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function partName(id: string): string {
  return getCatalogPart(id)?.name ?? "Unknown part";
}

function withNames(entries: CountEntry[], rename: (key: string) => string) {
  return entries.map((e) => ({ label: rename(e.key), count: e.count }));
}

function Yes({ value }: { value: boolean }) {
  return value ? (
    <span className="text-flux">Yes</span>
  ) : (
    <span className="font-medium text-copper-deep">Missing</span>
  );
}

function PartsTable({ caption, rows }: { caption: string; rows: CoverageRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="px-3 py-2 text-left text-xs text-mute">{caption}</caption>
        <thead className="bg-paper-deep text-xs text-mute">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Name</th>
            <th scope="col" className="px-3 py-2 font-medium">Type</th>
            <th scope="col" className="px-3 py-2 font-medium">Logic</th>
            <th scope="col" className="px-3 py-2 font-medium">Diagram drawing</th>
            <th scope="col" className="px-3 py-2 font-medium">Thumbnail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line">
              <th scope="row" className="px-3 py-2 font-medium text-ink">{row.name}</th>
              <td className="px-3 py-2 text-ink-soft">{row.group}</td>
              <td className="px-3 py-2 text-ink-soft">{row.logic}</td>
              <td className="px-3 py-2"><Yes value={row.hasDrawing} /></td>
              <td className="px-3 py-2"><Yes value={row.hasThumbnail} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Dashboard({ changed }: { changed: boolean }) {
  const coverage = buildCoverage();
  let stats: GuideStats | null = null;
  let capped = false;
  let failed = false;
  try {
    const result = await loadGuideStats();
    stats = result.stats;
    capped = result.capped;
  } catch {
    failed = true;
  }

  const retentionDays = getRetentionDays();

  return (
    <Shell
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-paper-deep"
          >
            Settings
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-paper-deep"
            >
              Log out
            </button>
          </form>
        </div>
      }
    >
      {changed ? (
        <p role="status" className="mb-4 rounded-md border border-line bg-white/60 p-3 text-sm text-ink">
          Password changed. Other sessions have been signed out.
        </p>
      ) : null}
      <p className="rounded-md border border-line bg-white/60 p-3 text-sm text-ink-soft">
        What this page shows: counts only. How many guides exist, which boards and power
        sources they use, whether they pass the safety checks, and which parts and images
        the site supports. No guide links, titles or content appear here.
      </p>

      <Section title="Guides">
        {failed || !stats ? (
          <p role="alert" className="text-sm text-warn-ink">
            Could not read guides from the database. Check the Supabase settings.
          </p>
        ) : (
          <GuideSections
            stats={stats}
            capped={capped}
            retentionDays={retentionDays}
          />
        )}
      </Section>

      <Section title="Catalog coverage">
        <Tiles>
          <Tile label="Boards" value={coverage.boards.length} />
          <Tile label="Modules and sensors" value={coverage.modules.length} />
          <Tile label="Basic parts" value={coverage.basicParts.length} />
          <Tile label="Recipes" value={coverage.recipeCount} />
        </Tiles>
        <p className="mt-3 text-sm text-ink-soft">
          Of {coverage.total} parts, {coverage.percent.drawing}% have a diagram drawing and{" "}
          {coverage.percent.thumbnail}% have a thumbnail.
        </p>
        <div className="mt-4 space-y-6">
          <PartsTable caption="Boards and microcontrollers" rows={coverage.boards} />
          {coverage.moduleGroups.map((group) => (
            <PartsTable
              key={group.group}
              caption={`Modules and sensors: ${group.group}`}
              rows={group.rows}
            />
          ))}
          <PartsTable caption="Basic parts: passives and power sources" rows={coverage.basicParts} />
        </div>
      </Section>

      <Section title="Missing images">
        {coverage.missing.length === 0 ? (
          <p className="text-sm text-ink-soft">Every part has a drawing and a thumbnail.</p>
        ) : (
          <PartsTable
            caption={`${coverage.missing.length} parts with no thumbnail or no drawing`}
            rows={coverage.missing}
          />
        )}
      </Section>
    </Shell>
  );
}

function GuideSections({
  stats,
  capped,
  retentionDays,
}: {
  stats: GuideStats;
  capped: boolean;
  retentionDays: number;
}) {
  return (
    <div className="space-y-6">
      {capped ? (
        <p className="text-sm text-warn-ink">
          Only the first {MAX_ROWS.toLocaleString("en-US")} guides were counted. Numbers below
          are partial.
        </p>
      ) : null}
      <Tiles>
        <Tile label="Total guides" value={stats.total} />
        <Tile label="Created today (UTC)" value={stats.created.today} />
        <Tile label="Last 7 days" value={stats.created.last7} />
        <Tile label="Last 30 days" value={stats.created.last30} />
      </Tiles>
      <Tiles>
        <Tile label="Pass all checks" value={stats.validation.ok} />
        <Tile label="With warnings" value={stats.validation.warnings} />
        <Tile label="Blocked" value={stats.validation.blocked} hint="Has an error" />
        <Tile
          label="Average size"
          value={`${stats.avgParts.toFixed(1)} parts`}
          hint={`${stats.avgConnections.toFixed(1)} wires`}
        />
      </Tiles>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Guides by board</h3>
          <BarList
            label="Guides by board"
            entries={withNames(stats.byBoard, (k) => (k === "not set" ? "No board yet" : partName(k)))}
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Guides by power source</h3>
          <BarList
            label="Guides by power source"
            entries={withNames(stats.byPower, (k) => POWER_LABELS[k] ?? k)}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Most used parts (top 10)</h3>
        <BarList
          label="Most used parts"
          entries={withNames(stats.topParts, partName)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">
          Retention (guides are deleted after {retentionDays} days unopened)
        </h3>
        {stats.retention ? (
          <Tiles>
            <Tile label="Never opened again" value={stats.retention.neverReopened} />
            <Tile label="Not opened for 14+ days" value={stats.retention.idle14} />
            <Tile label="Expiring within 7 days" value={stats.retention.expiringSoon} />
          </Tiles>
        ) : (
          <p className="text-sm text-warn-ink">
            Run supabase/migrations/0001_guide_retention.sql to track this.
          </p>
        )}
      </div>
    </div>
  );
}
