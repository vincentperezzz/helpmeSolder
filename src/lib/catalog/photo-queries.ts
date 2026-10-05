import { cleanName } from "./photo-shared";
import type { PartCategory } from "./part-media";
import { getActiveCatalog } from "./registry";
import { SEED_PHOTO_QUERY_OVERRIDES } from "./seed-photo-queries";

/**
 * Search phrases for outside photos, chosen per catalog part.
 *
 * The catalog name alone often finds nothing ("DHT22 Temp/Humidity") or the
 * wrong thing ("Pushbutton" matches a 1980s control desk), so every part has
 * phrases that were checked against live Commons / Wikipedia / Openverse
 * results. A result title must contain the words of the phrase that found it,
 * so phrases should be words a good photo's file name would really contain.
 */

export type PhotoQueries = {
  /** Commons file searches, tried in order. Also used for Openverse by default. */
  commons: string[];
  /** Exact Wikipedia article titles; empty falls back to searching `commons`. */
  wikipedia: string[];
  openverse: string[];
};

export { SEED_PHOTO_QUERY_OVERRIDES };

/** Fallback phrase for a part without an override: its name plus a noun. */
export function defaultQuery(name: string, category: PartCategory): string {
  const base = cleanName(name);
  if (!base) return "";
  if (category === "Board") return `${base} board`;
  if (category === "Basic part" || category === "Power") return base;
  return `${base} module`;
}

export function photoQueriesFor(
  part: { id: string; name: string },
  category: PartCategory,
): PhotoQueries {
  const override = getActiveCatalog().photoQueries.get(part.id) ?? SEED_PHOTO_QUERY_OVERRIDES[part.id];
  if (override) {
    const spec = Array.isArray(override) ? { commons: override } : override;
    return {
      commons: spec.commons,
      wikipedia: spec.wikipedia ?? [],
      openverse: spec.openverse ?? spec.commons,
    };
  }
  const fallback = defaultQuery(part.name, category);
  const list = fallback ? [fallback] : [];
  return { commons: list, wikipedia: [], openverse: list };
}
