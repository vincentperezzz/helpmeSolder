import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getRetentionDays } from "@/lib/guides/retention";
import { summarizeGuides, type GuideRow, type GuideStats } from "./stats";

export const PAGE_SIZE = 1000;
export const MAX_ROWS = 20_000;

export type FetchResult = {
  rows: GuideRow[];
  capped: boolean;
  hasAccessColumn: boolean;
};

const BASE_COLUMNS = "board_id,power_source,parts,connections,created_at,updated_at";

function isMissingColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    Boolean(error.message?.includes("last_accessed_at"))
  );
}

async function fetchAll(columns: string): Promise<{
  rows: GuideRow[];
  capped: boolean;
  error: { message?: string; code?: string } | null;
}> {
  const supabase = getSupabaseAdmin();
  const rows: GuideRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    // Ordered by the primary key so pages are stable. The id is never selected.
    const { data, error } = await supabase
      .from("guides")
      .select(columns)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { rows, capped: false, error };
    const page = (data ?? []) as unknown as GuideRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, capped: false, error: null };
  }
  // Read exactly MAX_ROWS rows; check whether more exist.
  const { data } = await supabase
    .from("guides")
    .select("board_id")
    .order("id", { ascending: true })
    .range(MAX_ROWS, MAX_ROWS);
  return { rows, capped: (data ?? []).length > 0, error: null };
}

/** Server-side only. Reads guides and summarizes them. Throws when the database cannot be read. */
export async function loadGuideStats(): Promise<{ stats: GuideStats; capped: boolean }> {
  const result = await fetchGuideRows();
  const stats = summarizeGuides(result.rows, {
    now: Date.now(),
    retentionDays: getRetentionDays(),
    hasAccessColumn: result.hasAccessColumn,
  });
  return { stats, capped: result.capped };
}

/** Server-side only. Fetches the guide columns the dashboard needs, in chunks. */
export async function fetchGuideRows(): Promise<FetchResult> {
  const withAccess = await fetchAll(`${BASE_COLUMNS},last_accessed_at`);
  if (!withAccess.error) {
    return { rows: withAccess.rows, capped: withAccess.capped, hasAccessColumn: true };
  }
  if (!isMissingColumn(withAccess.error)) {
    throw new Error("Could not read guides");
  }
  const basic = await fetchAll(BASE_COLUMNS);
  if (basic.error) throw new Error("Could not read guides");
  return { rows: basic.rows, capped: basic.capped, hasAccessColumn: false };
}
