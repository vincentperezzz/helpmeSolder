import type { AssetRecord } from "@/lib/catalog/asset-registry";

export type AssetShow = "all" | "missing" | "generic" | "issues";
export const ASSET_SHOWS: readonly { id: AssetShow; label: string }[] = [
  { id: "all", label: "All parts" },
  { id: "missing", label: "Missing a thumbnail" },
  { id: "generic", label: "Using a stand-in" },
  { id: "issues", label: "Has problems" },
];

export function parseShow(value: string | undefined): AssetShow {
  return ASSET_SHOWS.some((s) => s.id === value) ? (value as AssetShow) : "all";
}

export type AssetSummary = {
  parts: number;
  withPhoto: number;
  withIllustration: number;
  generic: number;
  missing: number;
  skeletonDrawings: number;
};

export function summarize(records: AssetRecord[]): AssetSummary {
  return {
    parts: records.length,
    withPhoto: records.filter((r) => r.thumbnailSource === "photo").length,
    withIllustration: records.filter((r) => r.thumbnailSource === "illustration").length,
    generic: records.filter((r) => r.usesGeneric).length,
    missing: records.filter((r) => !r.thumbnailUrl).length,
    skeletonDrawings: records.filter((r) => r.drawingKind === "skeleton").length,
  };
}

export type AssetView = "grid" | "list";

export function parseView(value: string | undefined): AssetView {
  return value === "list" ? "list" : "grid";
}

export type AssetFilter = { cat: string; show: AssetShow; q: string; view: AssetView };

export function categoriesOf(records: AssetRecord[]): string[] {
  return [...new Set(records.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
}

export function filterRecords(records: AssetRecord[], f: Omit<AssetFilter, "view">): AssetRecord[] {
  const q = f.q.trim().toLowerCase();
  return records.filter((r) => {
    if (f.cat && r.category !== f.cat) return false;
    if (f.show === "missing" && r.thumbnailUrl) return false;
    if (f.show === "generic" && !r.usesGeneric) return false;
    if (f.show === "issues" && r.issues.length === 0) return false;
    if (q && !`${r.name} ${r.partId} ${r.category}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export type GenericUse = { ref: string; count: number; previewUrl: string | null; partNames: string[] };

/** Each distinct generic stand-in with how many parts rely on it. Most used first. */
export function genericUsage(records: AssetRecord[]): GenericUse[] {
  const map = new Map<string, GenericUse>();
  for (const r of records) {
    if (!r.genericRef) continue;
    const entry = map.get(r.genericRef) ?? { ref: r.genericRef, count: 0, previewUrl: null, partNames: [] };
    entry.count += 1;
    entry.partNames.push(r.name);
    // Only a standalone generic image is worth previewing; a part's own art is not.
    if (!entry.previewUrl && r.thumbnailSource === "generic" && r.thumbnailUrl) {
      entry.previewUrl = r.thumbnailUrl;
    }
    map.set(r.genericRef, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.ref.localeCompare(b.ref));
}

/** Chip text shown instead of a drawing preview. */
export function drawingLabel(r: Pick<AssetRecord, "drawingKind" | "drawingRef">): string {
  switch (r.drawingKind) {
    case "wokwi-element":
      return r.drawingRef ? `Wokwi element: ${r.drawingRef}` : "Wokwi element";
    case "builtin":
      return "Built-in drawing";
    case "skeleton":
      return "Generic skeleton";
    default:
      return "Board drawing";
  }
}

/** Where the admin can find the thumbnail file in the project. */
export function thumbnailFilePath(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `public${url.startsWith("/") ? "" : "/"}${url}`;
}

export type AssetBadge = {
  label: "Photo" | "Illustration" | "Generic" | "Missing";
  tone: "ok" | "info" | "warn" | "bad";
};

export function badgesFor(r: AssetRecord): AssetBadge[] {
  const out: AssetBadge[] = [];
  if (!r.thumbnailUrl) out.push({ label: "Missing", tone: "bad" });
  else if (r.thumbnailSource === "photo") out.push({ label: "Photo", tone: "ok" });
  else if (r.thumbnailSource === "illustration") out.push({ label: "Illustration", tone: "info" });
  if (r.usesGeneric) out.push({ label: "Generic", tone: "warn" });
  return out;
}

export function assetsHref(f: Partial<AssetFilter>): string {
  const p = new URLSearchParams();
  if (f.cat) p.set("cat", f.cat);
  if (f.show && f.show !== "all") p.set("show", f.show);
  if (f.view === "list") p.set("view", "list");
  if (f.q?.trim()) p.set("q", f.q.trim());
  const s = p.toString();
  return s ? `/admin/assets?${s}` : "/admin/assets";
}
