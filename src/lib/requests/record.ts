import { after } from "next/server";
import { clientHash } from "@/lib/analytics/clients";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizePartKey, suggestClosest } from "./normalize";

export type MissSource = "add_part" | "request_part" | "api_patch";

export type PartRequestInput = {
  name: string;
  kind?: string;
  source: MissSource;
  pins?: { id: string; label?: string; kind?: string }[];
  note?: string;
};

type HeaderSource = { headers: { get(name: string): string | null } };

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|preview/i;
const MAX_SEEN = 5000;
const BACKOFF_MS = 10 * 60_000;
const ALIAS_TTL_MS = 60_000;
const MAX_ALIASES = 500;
const MISSING_CODES = new Set(["42P01", "PGRST202", "PGRST205"]);

const seen = new Set<string>();
const aliasCache = new Map<string, { value: string | null; at: number }>();
let pausedUntil = 0;
let warned = false;

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text === "" ? null : text;
}

/** Limits and cleans everything that will be stored. Exported for tests. */
export function sanitizeRequest(input: PartRequestInput) {
  const name = clean(input.name, 80);
  const key = name ? normalizePartKey(name) : null;
  if (!name || !key) return null;
  const pins = (Array.isArray(input.pins) ? input.pins : [])
    .slice(0, 40)
    .map((pin) => ({
      id: clean(pin?.id, 30),
      label: clean(pin?.label, 40),
      kind: clean(pin?.kind, 20),
    }))
    .filter((pin): pin is { id: string; label: string | null; kind: string | null } => pin.id !== null)
    .map((pin) => ({ id: pin.id, label: pin.label ?? pin.id, kind: pin.kind }));
  return {
    key,
    name,
    kind: clean(input.kind, 20),
    source: input.source,
    pins: pins.length > 0 ? pins : null,
    note: clean(input.note, 200),
  };
}

function shouldSkip(request: HeaderSource): boolean {
  if (request.headers.get("dnt") === "1") return true;
  if (request.headers.get("sec-gpc") === "1") return true;
  return BOT_PATTERN.test(request.headers.get("user-agent") ?? "");
}

/** Best-effort, never throws. Counts one request per client per day per part. */
export async function recordPartRequest(
  input: PartRequestInput & { request: HeaderSource },
  now: Date = new Date(),
): Promise<void> {
  try {
    if (shouldSkip(input.request) || now.getTime() < pausedUntil) return;
    const cleaned = sanitizeRequest(input);
    if (!cleaned) return;

    const hash = clientHash(input.request, now);
    const dedupe = `${now.toISOString().slice(0, 10)}|${cleaned.key}|${hash}`;
    if (seen.has(dedupe)) return;
    if (seen.size >= MAX_SEEN) seen.clear();
    seen.add(dedupe);

    const { error } = await getSupabaseAdmin().rpc("record_part_request", {
      p_key: cleaned.key,
      p_display_name: cleaned.name,
      p_kind: cleaned.kind,
      p_source: cleaned.source,
      p_pins: cleaned.pins,
      p_note: cleaned.note,
      p_suggested: suggestClosest(cleaned.name, 1)[0]?.id ?? null,
      p_client_hash: hash,
    });
    if (error) {
      seen.delete(dedupe);
      if (error.code && MISSING_CODES.has(error.code)) {
        pausedUntil = now.getTime() + BACKOFF_MS;
        if (!warned) {
          warned = true;
          console.warn("[requests] part_requests table or function missing; apply migration 0005");
        }
      }
    }
  } catch {
    // Must never affect the caller.
  }
}

/** Records after the response is sent when possible. */
export function recordPartRequestLater(
  input: PartRequestInput & { request: HeaderSource },
): void {
  const run = () => recordPartRequest(input);
  try {
    after(run);
  } catch {
    void run();
  }
}

/**
 * Catalog id an admin mapped this name to, or null. Cached for 60 seconds.
 * Never throws.
 */
export async function resolveAlias(
  name: string,
  now: number = Date.now(),
): Promise<string | null> {
  try {
    const key = normalizePartKey(name);
    if (!key) return null;
    const cached = aliasCache.get(key);
    if (cached && now - cached.at < ALIAS_TTL_MS) return cached.value;

    const { data, error } = await getSupabaseAdmin()
      .from("part_requests")
      .select("mapped_catalog_id")
      .eq("key", key)
      .not("mapped_catalog_id", "is", null)
      .maybeSingle();
    if (error) return null;
    const value =
      typeof data?.mapped_catalog_id === "string" && data.mapped_catalog_id !== ""
        ? data.mapped_catalog_id
        : null;
    if (aliasCache.size >= MAX_ALIASES) aliasCache.clear();
    aliasCache.set(key, { value, at: now });
    return value;
  } catch {
    return null;
  }
}

/** Deletes hit rows older than the given number of days. Best-effort. */
export async function purgeOldRequestHits(
  days = 180,
  now: Date = new Date(),
): Promise<void> {
  try {
    const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
    await getSupabaseAdmin().from("part_request_hits").delete().lt("day", cutoff);
  } catch {
    // Ignore.
  }
}

/** Test helper. */
export function resetRequestState(): void {
  seen.clear();
  aliasCache.clear();
  pausedUntil = 0;
  warned = false;
}
