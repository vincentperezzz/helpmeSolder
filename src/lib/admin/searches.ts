import { classifyDbError, type DbError } from "./db-errors";
import {
  MAX_ROWS,
  NOTE_MAX,
  PAGE_SIZE,
  demandBarPercent,
  relativeTime,
  validateAdminNote,
  validateRequestKey,
} from "./requests";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export { NOTE_MAX, demandBarPercent, relativeTime, validateAdminNote, validateRequestKey };

export const SEARCH_STATUSES = ["new", "handled", "ignored"] as const;
export type SearchStatus = (typeof SEARCH_STATUSES)[number];

export const SEARCH_SOURCES = ["search_catalog", "ask_sensor"] as const;
export type SearchSource = (typeof SEARCH_SOURCES)[number];

export const SOURCE_LABELS: Record<SearchSource, string> = {
  search_catalog: "Catalog search",
  ask_sensor: "Sensor question",
};

export type CatalogSearch = {
  key: string;
  query: string;
  source: SearchSource;
  demand: number;
  searches: number;
  no_match_searches: number;
  last_result_count: number;
  top_match_id: string | null;
  top_score: number | null;
  first_seen: string;
  last_seen: string;
  status: SearchStatus;
  admin_note: string | null;
  updated_at: string | null;
};

export const VIEWS = ["all", "nomatch", "found", "handled", "ignored"] as const;
export type SearchView = (typeof VIEWS)[number];
export type SourceFilter = "all" | SearchSource;

export const VIEW_LABELS: Record<SearchView, string> = {
  all: "All",
  nomatch: "No match",
  found: "Found",
  handled: "Handled",
  ignored: "Ignored",
};

export const SOURCE_FILTER_LABELS: Record<SourceFilter, string> = {
  all: "All",
  search_catalog: "Catalog search",
  ask_sensor: "Sensor question",
};

export const VIEW_CHIPS: readonly SearchView[] = VIEWS;
export const SOURCE_CHIPS: readonly SourceFilter[] = ["all", ...SEARCH_SOURCES];

export function parseSearchStatus(value: unknown): SearchStatus | null {
  return typeof value === "string" && (SEARCH_STATUSES as readonly string[]).includes(value)
    ? (value as SearchStatus)
    : null;
}

export function parseView(value: unknown): SearchView {
  return typeof value === "string" && (VIEWS as readonly string[]).includes(value)
    ? (value as SearchView)
    : "all";
}

export function parseSourceFilter(value: unknown): SourceFilter {
  return typeof value === "string" && (SEARCH_SOURCES as readonly string[]).includes(value)
    ? (value as SearchSource)
    : "all";
}

export function isNoMatch(row: CatalogSearch): boolean {
  return row.last_result_count === 0;
}

/** New first, then demand high to low, then most recently seen. Does not change the input. */
export function sortSearches(rows: CatalogSearch[]): CatalogSearch[] {
  const time = (value: string) => {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  };
  const waiting = (r: CatalogSearch) => (r.status === "new" ? 0 : 1);
  return [...rows].sort(
    (a, b) =>
      waiting(a) - waiting(b) ||
      b.demand - a.demand ||
      time(b.last_seen) - time(a.last_seen) ||
      a.key.localeCompare(b.key),
  );
}

export function filterBySource(rows: CatalogSearch[], source: SourceFilter): CatalogSearch[] {
  return source === "all" ? rows : rows.filter((r) => r.source === source);
}

/** No match and Found only cover searches still waiting. Handled and Ignored are their own views. */
export function filterByView(rows: CatalogSearch[], view: SearchView): CatalogSearch[] {
  switch (view) {
    case "all":
      return rows;
    case "nomatch":
      return rows.filter((r) => r.status === "new" && isNoMatch(r));
    case "found":
      return rows.filter((r) => r.status === "new" && !isNoMatch(r));
    case "handled":
      return rows.filter((r) => r.status === "handled");
    case "ignored":
      return rows.filter((r) => r.status === "ignored");
  }
}

export function countByView(rows: CatalogSearch[]): Record<SearchView, number> {
  const counts = {} as Record<SearchView, number>;
  for (const view of VIEWS) counts[view] = filterByView(rows, view).length;
  return counts;
}

export function countBySource(rows: CatalogSearch[]): Record<SourceFilter, number> {
  return {
    all: rows.length,
    search_catalog: filterBySource(rows, "search_catalog").length,
    ask_sensor: filterBySource(rows, "ask_sensor").length,
  };
}

export type SearchTotals = { searches: number; noMatch: number; waiting: number };

export function searchTotals(rows: CatalogSearch[]): SearchTotals {
  return {
    searches: rows.reduce((sum, r) => sum + (Number.isFinite(r.demand) ? r.demand : 0), 0),
    noMatch: filterByView(rows, "nomatch").length,
    waiting: rows.filter((r) => r.status === "new").length,
  };
}

/** "1 person searched" or "3 people searched". */
export function searchedText(demand: number): string {
  return `${demand} ${demand === 1 ? "person" : "people"} searched`;
}

/** Raw search count, only when it differs from the number of people. */
export function rawSearchesText(demand: number, searches: number): string {
  return searches !== demand ? `${searches} ${searches === 1 ? "search" : "searches"} in total` : "";
}

/** "No match", or "Found 3". */
export function outcomeText(resultCount: number): string {
  return resultCount === 0 ? "No match" : `Found ${resultCount}`;
}

/** Best match name, or null when there is no id or the part no longer exists. */
export function bestMatchName(
  topMatchId: string | null,
  lookup: (id: string) => string | undefined,
): string | null {
  return topMatchId ? (lookup(topMatchId) ?? null) : null;
}

export function lastSeenText(iso: string | null | undefined, now: number): string {
  const rel = relativeTime(iso, now);
  return rel === "unknown" ? "Last seen at an unknown time" : `Last seen ${rel}`;
}

export function searchesHref(view: SearchView, source: SourceFilter, msg?: string): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (source !== "all") params.set("source", source);
  if (msg) params.set("msg", msg);
  const query = params.toString();
  return query ? `/admin/searches?${query}` : "/admin/searches";
}

export function isMissingSearchesTable(error: DbError): boolean {
  return classifyDbError(error, "catalog_searches") === "missing";
}

export type SearchesLoad =
  | { kind: "ok"; rows: CatalogSearch[]; capped: boolean }
  | { kind: "missing" }
  | { kind: "denied" }
  | { kind: "error" };

const COLUMNS =
  "key,query,source,demand,searches,no_match_searches,last_result_count,top_match_id,top_score,first_seen,last_seen,status,admin_note,updated_at";

/** Server-side only. Reads up to 5000 searches in pages of 1000. */
export async function loadSearches(): Promise<SearchesLoad> {
  try {
    const supabase = getSupabaseAdmin();
    const rows: CatalogSearch[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("catalog_searches")
        .select(COLUMNS)
        .order("key", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        const problem = classifyDbError(error, "catalog_searches");
        return problem === "missing" ? { kind: "missing" } : problem === "denied" ? { kind: "denied" } : { kind: "error" };
      }
      const page = (data ?? []) as unknown as CatalogSearch[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return { kind: "ok", rows: sortSearches(rows), capped: false };
    }
    return { kind: "ok", rows: sortSearches(rows), capped: true };
  } catch {
    return { kind: "error" };
  }
}
