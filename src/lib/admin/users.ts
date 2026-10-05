import { getSupabaseAdmin } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;
export const PAGE_SIZE = 1000;
/** Safety cap on rows read (30 days of daily unique rows). */
export const MAX_ROWS = 100_000;
export const BAR_DAYS = 14;

export type ClientKind = "visitor" | "creator";

/** Daily unique counts per kind, keyed by UTC date (YYYY-MM-DD). */
export type DailyCounts = Record<ClientKind, Record<string, number>>;

export type KindTotals = { today: number; yesterday: number; last7: number; last30: number };
export type DayCount = { day: string; count: number };

export type UserStats = {
  visitors: KindTotals;
  creators: KindTotals;
  /** Oldest first, exactly BAR_DAYS entries ending today (UTC). */
  visitorsByDay: DayCount[];
  /** Busiest visitor day in the last 30 days, null when there were no visitors. */
  busiestDay: DayCount | null;
};

export type UserLoad =
  | { kind: "ok"; stats: UserStats; capped: boolean }
  | { kind: "missing" }
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
  const visitorsByDay: DayCount[] = [];
  for (let i = BAR_DAYS - 1; i >= 0; i--) {
    const day = dayOffset(now, i);
    visitorsByDay.push({ day, count: daily.visitor[day] ?? 0 });
  }
  let busiestDay: DayCount | null = null;
  for (let i = 0; i < 30; i++) {
    const day = dayOffset(now, i);
    const count = daily.visitor[day] ?? 0;
    if (count > 0 && (!busiestDay || count > busiestDay.count)) busiestDay = { day, count };
  }
  return {
    visitors: totals(daily.visitor, now),
    creators: totals(daily.creator, now),
    visitorsByDay,
    busiestDay,
  };
}

type DbError = { message?: string; code?: string } | null;

export function isMissingTable(error: DbError): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("daily_clients"))
  );
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
      if (error) return isMissingTable(error) ? { kind: "missing" } : { kind: "error" };
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
