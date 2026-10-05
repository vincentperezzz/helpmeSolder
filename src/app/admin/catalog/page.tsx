import Link from "next/link";
import { buildCoverage } from "@/lib/admin/coverage";
import { fetchGuideRows } from "@/lib/admin/data";
import { guideUsageCounts } from "@/lib/admin/usage";
import { guardAdmin } from "../_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "../_components/meta";
import { SectionNav, type SectionNavItem } from "../_components/SectionNav";
import { AdminShell } from "../_components/shell";
import { PartsTable, Tile, Tiles } from "../_components/ui";

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

  const categories = coverage.categories.filter((c) => c.count > 0);
  const navItems: SectionNavItem[] = [
    { id: "overview", label: "Overview" },
    { id: "missing-images", label: "Missing images", count: coverage.missing.length },
    ...categories.map((c) => ({
      id: `cat-${c.id}`,
      label: c.label,
      count: c.count,
      missing: c.missing,
    })),
  ];

  return (
    <AdminShell session={guard.session} active="catalog" title="Admin catalog">
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <div className="contents lg:block">
          <SectionNav items={navItems} label="Catalog categories" />
        </div>
        <div className="min-w-0 pb-20 lg:pb-0">
          <div id="overview" className="scroll-mt-20">
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

            <p className="mt-3 text-sm text-ink-soft">
              To see the actual images for every part, open the{" "}
              <Link href="/admin/assets" className="underline">
                Assets tab
              </Link>
              .
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
          </div>

          {categories.map((c) => (
            <section
              key={c.id}
              id={`cat-${c.id}`}
              aria-labelledby={`cat-${c.id}-h`}
              className="mt-8 scroll-mt-20"
            >
              <h2 id={`cat-${c.id}-h`} className="font-display text-lg font-bold text-ink">
                {c.label}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{c.description}</p>
              <p className="mt-1 mb-3 text-xs text-mute">
                {c.drawings} of {c.count} drawn ({c.percent.drawing}%), {c.thumbnails} of {c.count}{" "}
                with a thumbnail ({c.percent.thumbnail}%)
              </p>
              <PartsTable usage={usage} caption={`${c.label}: ${c.count} parts`} rows={c.rows} />
            </section>
          ))}

          <section id="missing-images" aria-labelledby="missing-images-h" className="mt-8 scroll-mt-20">
            <h2 id="missing-images-h" className="mb-3 font-display text-lg font-bold text-ink">
              Missing images
            </h2>
            {coverage.missing.length === 0 ? (
              <p className="text-sm text-ink-soft">Every part has a drawing and a thumbnail.</p>
            ) : (
              <PartsTable
                usage={usage}
                caption={`${coverage.missing.length} parts with no thumbnail or no drawing`}
                rows={coverage.missing}
              />
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
