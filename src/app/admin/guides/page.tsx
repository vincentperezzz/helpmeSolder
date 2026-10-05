import { getCatalogPart } from "@/lib/catalog";
import { MAX_ROWS, loadGuideStats } from "@/lib/admin/data";
import type { CountEntry, GuideStats } from "@/lib/admin/stats";
import { guardAdmin } from "../_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "../_components/meta";
import { AdminShell } from "../_components/shell";
import { BarList, Tile, Tiles } from "../_components/ui";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("Admin guides");

const POWER_LABELS: Record<string, string> = {
  usb_wall: "USB wall",
  battery_9v: "9V battery",
  battery_2aa: "2xAA holder",
  battery_3aa: "3xAA holder",
  battery_18650: "18650 Li-ion",
  "not set": "Not set",
};

function partName(id: string): string {
  return getCatalogPart(id)?.name ?? "Unknown part";
}

function withNames(entries: CountEntry[], rename: (key: string) => string) {
  return entries.map((e) => ({ label: rename(e.key), count: e.count }));
}

export default async function AdminGuidesPage() {
  const guard = await guardAdmin("dashboard");
  if (guard.kind !== "ok") {
    return (
      <main className="mx-auto w-full max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Admin</h1>
        <p role="alert" className="mt-4 text-sm text-warn-ink">
          {UNAVAILABLE_TEXT}
        </p>
      </main>
    );
  }

  let stats: GuideStats | null = null;
  let capped = false;
  try {
    const result = await loadGuideStats();
    stats = result.stats;
    capped = result.capped;
  } catch {
    stats = null;
  }

  return (
    <AdminShell session={guard.session} active="guides" title="Admin guides">
      {!stats ? (
        <p role="alert" className="text-sm text-warn-ink">
          Could not read guides from the database. Check the Supabase settings.
        </p>
      ) : (
        <div className="space-y-6">
          {capped ? (
            <p className="text-sm text-warn-ink">
              Only the first {MAX_ROWS.toLocaleString("en-US")} guides were counted. Numbers below
              are partial.
            </p>
          ) : null}
          <Tiles>
            <Tile label="Total guides" value={stats.total} />
            <Tile label="Pass all checks" value={stats.validation.ok} />
            <Tile label="With warnings" value={stats.validation.warnings} />
            <Tile label="Blocked" value={stats.validation.blocked} hint="Has an error" />
          </Tiles>
          <Tiles>
            <Tile
              label="Average size"
              value={`${stats.avgParts.toFixed(1)} parts`}
              hint={`${stats.avgConnections.toFixed(1)} wires`}
            />
          </Tiles>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">Guides by board</h2>
              <BarList
                label="Guides by board"
                entries={withNames(stats.byBoard, (k) => (k === "not set" ? "No board yet" : partName(k)))}
              />
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">Guides by power source</h2>
              <BarList
                label="Guides by power source"
                entries={withNames(stats.byPower, (k) => POWER_LABELS[k] ?? k)}
              />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Most used parts (top 10)</h2>
            <BarList label="Most used parts" entries={withNames(stats.topParts, partName)} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Safety check results</h2>
            <BarList
              label="Safety check results"
              entries={[
                { label: "Pass all checks", count: stats.validation.ok },
                { label: "With warnings", count: stats.validation.warnings },
                { label: "Blocked (has an error)", count: stats.validation.blocked },
              ]}
            />
          </div>
        </div>
      )}
    </AdminShell>
  );
}
