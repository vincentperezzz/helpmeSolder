import type { GuidePart } from "@/lib/catalog/types";

/** How many guides contain each catalog part. A part used twice in one guide counts once. */
export function guideUsageCounts(partLists: (GuidePart[] | null)[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const parts of partLists) {
    const seen = new Set<string>();
    for (const part of parts ?? []) {
      if (typeof part?.catalogId === "string") seen.add(part.catalogId);
    }
    for (const id of seen) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
