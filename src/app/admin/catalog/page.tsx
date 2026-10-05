import { buildCoverage } from "@/lib/admin/coverage";
import { fetchGuideRows } from "@/lib/admin/data";
import { guideUsageCounts } from "@/lib/admin/usage";
import { guardAdmin } from "../_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "../_components/meta";
import { AdminShell } from "../_components/shell";
import { PartsTable, Section, Tile, Tiles } from "../_components/ui";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("Admin catalog");

export default async function AdminCatalogPage() {
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

  const coverage = buildCoverage();
  let usage: Map<string, number> | null = null;
  let capped = false;
  try {
    const result = await fetchGuideRows();
    usage = guideUsageCounts(result.rows.map((r) => r.parts));
    capped = result.capped;
  } catch {
    usage = null;
  }
  return (
    <AdminShell session={guard.session} active="catalog" title="Admin catalog">
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

      {!usage ? (
        <p className="mt-3 text-sm text-warn-ink">
          Could not read guides, so the Used in guides column shows n/a.
        </p>
      ) : capped ? (
        <p className="mt-3 text-sm text-warn-ink">
          Only the first 20,000 guides were counted, so Used in guides is partial.
        </p>
      ) : null}

      <Section title="Catalog coverage">
        <div className="space-y-6">
          <PartsTable usage={usage} caption="Boards and microcontrollers" rows={coverage.boards} />
          {coverage.moduleGroups.map((group) => (
            <PartsTable usage={usage}
              key={group.group}
              caption={`Modules and sensors: ${group.group}`}
              rows={group.rows}
            />
          ))}
          <PartsTable usage={usage} caption="Basic parts: passives and power sources" rows={coverage.basicParts} />
        </div>
      </Section>

      <Section title="Missing images">
        {coverage.missing.length === 0 ? (
          <p className="text-sm text-ink-soft">Every part has a drawing and a thumbnail.</p>
        ) : (
          <PartsTable usage={usage}
            caption={`${coverage.missing.length} parts with no thumbnail or no drawing`}
            rows={coverage.missing}
          />
        )}
      </Section>
    </AdminShell>
  );
}
