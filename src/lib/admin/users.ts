import { classifyDbError, type DbError } from "./db-errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { DailyPoint } from "./chart";

const DAY_MS = 24 * 60 * 60 * 1000;
export const PAGE_SIZE = 1000;
/** Safety cap on rows read (30 days of daily unique rows). */
export const MAX_ROWS = 100_000;
export const CHART_DAYS = 30;

export type ClientKind = "visitor" | "creator";

/** Daily unique counts per kind, keyed by UTC date (YYYY-MM-DD). */
export type DailyCounts = Record<ClientKind, Record<string, number>>;

export type KindTotals = { today: number; yesterday: number; last7: number; last30: number };

export type UserStats = {
  visitors: KindTotals;
  creators: KindTotals;
  /** Oldest first, exactly CHART_DAYS zero-filled entries ending today (UTC). */
  series: DailyPoint[];
};

export type UserLoad =
  | { kind: "ok"; stats: UserStats; capped: boolean }
  | { kind: "missing" }
  | { kind: "denied" }
  | { kind: "error" };

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function dayOffset(now: number, back: number): string {
  return utcDay(now - back * DAY_MS);
}

function windowSum(counts: Record<string, number>, now: number, days: number): number {
  let sum = 0;
  for (let i = 0; i < days; i++) sum += counts[dayOffset(now, i)] ?? 0;
  return sum;
}

function totals(counts: Record<string, number>, now: number): KindTotals {
  return {
    today: counts[dayOffset(now, 0)] ?? 0,
    yesterday: counts[dayOffset(now, 1)] ?? 0,
    last7: windowSum(counts, now, 7),
    last30: windowSum(counts, now, 30),
  };
}

/** Pure. Windows are whole UTC days: "last 7 days" is today plus the 6 days before it. */
export function summarizeUsers(daily: DailyCounts, now: number): UserStats {
  return {
    visitors: totals(daily.visitor, now),
    creators: totals(daily.creator, now),
    series: buildSeries(daily, now),
  };
}

/** Pure. Oldest first, CHART_DAYS entries ending today (UTC), missing days are zero. */
export function buildSeries(daily: DailyCounts, now: number, days: number = CHART_DAYS): DailyPoint[] {
  const series: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayOffset(now, i);
    series.push({ day, visitors: daily.visitor[day] ?? 0, creators: daily.creator[day] ?? 0 });
  }
  return series;
}

export function isMissingTable(error: DbError): boolean {
  return classifyDbError(error, "daily_clients") === "missing";
}

/** Server-side only. Counts distinct clients per day and kind for the last 30 days. */
export async function loadUserStats(now: number = Date.now()): Promise<UserLoad> {
  const since = dayOffset(now, 29);
  const daily: DailyCounts = { visitor: {}, creator: {} };
  let capped = false;
  try {
    const supabase = getSupabaseAdmin();
    let read = 0;
    for (let from = 0; ; from += PAGE_SIZE) {
      if (read >= MAX_ROWS) {
        capped = true;
        break;
      }
      // The hash is never selected, so nothing identifying leaves the database.
      const { data, error } = await supabase
        .from("daily_clients")
        .select("day,kind")
        .gte("day", since)
        .order("day", { ascending: true })
        .order("kind", { ascending: true })
        .order("client_hash", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        const problem = classifyDbError(error, "daily_clients");
        return problem === "missing" ? { kind: "missing" } : problem === "denied" ? { kind: "denied" } : { kind: "error" };
      }
      const page = (data ?? []) as unknown as { day: string; kind: string }[];
      for (const row of page) {
        if (row.kind === "visitor" || row.kind === "creator") {
          const bucket = daily[row.kind];
          bucket[row.day] = (bucket[row.day] ?? 0) + 1;
        }
      }
      read += page.length;
      if (page.length < PAGE_SIZE) break;
    }
  } catch {
    return { kind: "error" };
  }
  return { kind: "ok", stats: summarizeUsers(daily, now), capped };
}
