import { classifyDbError, type DbError } from "./db-errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const REQUEST_STATUSES = ["new", "planned", "building", "shipped", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type StatusFilter = "all" | RequestStatus;

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Waiting",
  planned: "Planned",
  building: "Building",
  shipped: "Added",
  rejected: "Rejected",
};

export const PAGE_SIZE = 1000;
export const MAX_ROWS = 5000;
export const NOTE_MAX = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RequestPin = { id?: string; label?: string; kind?: string };

export type PartRequest = {
  key: string;
  display_name: string;
  kind: string | null;
  source: string | null;
  demand: number;
  calls: number;
  first_seen: string;
  last_seen: string;
  example_pins: RequestPin[] | null;
  note: string | null;
  suggested_catalog_id: string | null;
  status: RequestStatus;
  mapped_catalog_id: string | null;
  admin_note: string | null;
  updated_at: string | null;
};

export function parseStatus(value: unknown): RequestStatus | null {
  return typeof value === "string" && (REQUEST_STATUSES as readonly string[]).includes(value)
    ? (value as RequestStatus)
    : null;
}

/** Reads the ?status= query value. Anything unknown means "all". */
export function parseStatusFilter(value: unknown): StatusFilter {
  return parseStatus(value) ?? "all";
}

export function filterByStatus(rows: PartRequest[], filter: StatusFilter): PartRequest[] {
  return filter === "all" ? rows : rows.filter((r) => r.status === filter);
}

/** Waiting (new) first, then demand high to low, then most recently seen. Does not change the input. */
export function sortRequests(rows: PartRequest[]): PartRequest[] {
  const time = (value: string) => {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  };
  const waiting = (r: PartRequest) => (r.status === "new" ? 0 : 1);
  return [...rows].sort(
    (a, b) =>
      waiting(a) - waiting(b) ||
      b.demand - a.demand ||
      time(b.last_seen) - time(a.last_seen) ||
      a.key.localeCompare(b.key),
  );
}

export const KIND_GROUPS = ["board", "sensor", "display", "output", "input", "power", "other"] as const;
export type KindGroup = (typeof KIND_GROUPS)[number];
export type KindFilter = "all" | KindGroup;

export const KIND_LABELS: Record<KindFilter, string> = {
  all: "All kinds",
  board: "Board",
  sensor: "Sensor",
  display: "Display",
  output: "Output",
  input: "Input",
  power: "Power",
  other: "Other",
};

const KIND_ALIASES: Record<string, KindGroup> = {
  board: "board",
  mcu: "board",
  microcontroller: "board",
  sensor: "sensor",
  display: "display",
  screen: "display",
  lcd: "display",
  oled: "display",
  output: "output",
  actuator: "output",
  led: "output",
  motor: "output",
  buzzer: "output",
  input: "input",
  button: "input",
  switch: "input",
  power: "power",
  battery: "power",
  supply: "power",
};

/** Groups the free-text kind an assistant gave into one of the filter kinds. */
export function kindGroup(kind: string | null | undefined): KindGroup {
  const key = typeof kind === "string" ? kind.trim().toLowerCase() : "";
  return KIND_ALIASES[key] ?? "other";
}

/** Reads the ?kind= query value. Anything unknown means "all". */
export function parseKindFilter(value: unknown): KindFilter {
  return typeof value === "string" && (KIND_GROUPS as readonly string[]).includes(value)
    ? (value as KindGroup)
    : "all";
}

export function filterByKind(rows: PartRequest[], filter: KindFilter): PartRequest[] {
  return filter === "all" ? rows : rows.filter((r) => kindGroup(r.kind) === filter);
}

export function countByKind(rows: PartRequest[]): Record<KindFilter, number> {
  const counts: Record<KindFilter, number> = {
    all: rows.length,
    board: 0,
    sensor: 0,
    display: 0,
    output: 0,
    input: 0,
    power: 0,
    other: 0,
  };
  for (const row of rows) counts[kindGroup(row.kind)]++;
  return counts;
}

/** Bar width as a whole percent of the highest demand. At least 4 so a small bar stays visible. */
export function demandBarPercent(demand: number, maxDemand: number): number {
  if (!(maxDemand > 0) || !(demand > 0)) return 0;
  return Math.min(100, Math.max(4, Math.round((demand / maxDemand) * 100)));
}

/** "1 person asked" or "3 people asked". */
export function askedText(demand: number): string {
  return `${demand} ${demand === 1 ? "person" : "people"} asked`;
}

/** Raw call count, only when it differs from the number of people. */
export function callsText(demand: number, calls: number): string {
  return calls !== demand ? `${calls} ${calls === 1 ? "request" : "requests"} in total` : "";
}

const SOURCE_SENTENCES: Record<string, string> = {
  request_part: "The assistant asked for it directly",
  add_part: "Asked while adding a part to a guide",
  api_patch: "Found in a guide update",
  set_power_source: "Asked for as a power source",
};

export function sourceSentence(source: string | null | undefined): string {
  return (source && SOURCE_SENTENCES[source]) || "Noted automatically";
}

export type RequestTotals = { waiting: number; inProgress: number; added: number; totalAsks: number };

export function requestTotals(rows: PartRequest[]): RequestTotals {
  const counts = countByStatus(rows);
  return {
    waiting: counts.new,
    inProgress: counts.planned + counts.building,
    added: counts.shipped,
    totalAsks: rows.reduce((sum, r) => sum + (Number.isFinite(r.demand) ? r.demand : 0), 0),
  };
}

export function countByStatus(rows: PartRequest[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: rows.length,
    new: 0,
    planned: 0,
    building: 0,
    shipped: 0,
    rejected: 0,
  };
  for (const row of rows) counts[row.status]++;
  return counts;
}

export type RequestSummary = { total: number; notStarted: number; inProgress: number };

/** Not started = new. In progress = planned or building. */
export function summarizeRequests(rows: PartRequest[]): RequestSummary {
  const counts = countByStatus(rows);
  return {
    total: rows.length,
    notStarted: counts.new,
    inProgress: counts.planned + counts.building,
  };
}

export function summaryText(summary: RequestSummary): string {
  const noun = summary.total === 1 ? "part" : "parts";
  return `${summary.total} ${noun} requested, ${summary.notStarted} not started, ${summary.inProgress} in progress`;
}

/** Plain relative wording such as "3 days ago". Future dates read as "just now". */
export function relativeTime(iso: string | null | undefined, now: number): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "unknown";
  const diff = now - t;
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(diff / DAY_MS);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** Compact pin list such as "VCC, GND, SDA, SCL". Empty when there are none. */
export function pinSummary(pins: RequestPin[] | null | undefined, limit = 12): string {
  if (!Array.isArray(pins)) return "";
  const names = pins
    .map((p) => (typeof p?.label === "string" && p.label.trim() ? p.label.trim() : p?.id))
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  if (names.length === 0) return "";
  const shown = names.slice(0, limit).join(", ");
  return names.length > limit ? `${shown} and ${names.length - limit} more` : shown;
}

export type NoteCheck = { ok: true; value: string | null } | { ok: false };

/** Trims, drops control characters, and rejects notes over 200 characters. Empty clears the note. */
export function validateAdminNote(input: unknown): NoteCheck {
  if (typeof input !== "string") return { ok: false };
  const clean = input.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
  if (clean.length > NOTE_MAX) return { ok: false };
  return { ok: true, value: clean === "" ? null : clean };
}

export type AliasCheck = { ok: true; id: string } | { ok: false };

/** The alias target must be a part that exists in the catalog. */
export function validateAliasTarget(input: unknown, exists: (id: string) => boolean): AliasCheck {
  if (typeof input !== "string") return { ok: false };
  const id = input.trim();
  return id && id.length <= 200 && exists(id) ? { ok: true, id } : { ok: false };
}

export function validateRequestKey(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const key = input.trim();
  return key && key.length <= 200 ? key : null;
}

export function isMissingRequestsTable(error: DbError): boolean {
  return classifyDbError(error, "part_requests") === "missing";
}

export type RequestsLoad =
  | { kind: "ok"; rows: PartRequest[]; capped: boolean }
  | { kind: "missing" }
  | { kind: "denied" }
  | { kind: "error" };

const COLUMNS =
  "key,display_name,kind,source,demand,calls,first_seen,last_seen,example_pins,note,suggested_catalog_id,status,mapped_catalog_id,admin_note,updated_at";

/** Server-side only. Reads up to 5000 requests in pages of 1000. */
export async function loadRequests(): Promise<RequestsLoad> {
  try {
    const supabase = getSupabaseAdmin();
    const rows: PartRequest[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("part_requests")
        .select(COLUMNS)
        .order("key", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        const problem = classifyDbError(error, "part_requests");
        return problem === "missing" ? { kind: "missing" } : problem === "denied" ? { kind: "denied" } : { kind: "error" };
      }
      const page = (data ?? []) as unknown as PartRequest[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return { kind: "ok", rows: sortRequests(rows), capped: false };
    }
    return { kind: "ok", rows: sortRequests(rows), capped: true };
  } catch {
    return { kind: "error" };
  }
}

export type NewRequestsCount =
  | { kind: "ok"; count: number }
  | { kind: "missing" }
  | { kind: "denied" }
  | { kind: "error" };

/** Server-side only. Number of requests with status new, or why it cannot be read. */
export async function countNewRequests(): Promise<NewRequestsCount> {
  try {
    const { count, error } = await getSupabaseAdmin()
      .from("part_requests")
      .select("key", { count: "exact", head: true })
      .eq("status", "new");
    if (error) {
      const problem = classifyDbError(error, "part_requests");
      return problem === "other" ? { kind: "error" } : { kind: problem };
    }
    return count === null ? { kind: "error" } : { kind: "ok", count };
  } catch {
    return { kind: "error" };
  }
}
