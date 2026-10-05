import { after } from "next/server";
import { clientHash } from "@/lib/analytics/clients";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizePartKey } from "./normalize";

export type SearchSource = "search_catalog" | "ask_sensor";

export type CatalogSearchInput = {
  query: string;
  source: SearchSource;
  /** How many catalog parts matched. */
  resultCount: number;
  topMatchId?: string | null;
  topScore?: number | null;
};

type HeaderSource = { headers: { get(name: string): string | null } };

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|preview/i;
const MAX_SEEN = 5000;
const BACKOFF_MS = 10 * 60_000;
const MISSING_CODES = new Set(["42P01", "PGRST202", "PGRST205"]);
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

const seen = new Set<string>();
let pausedUntil = 0;
let warned = false;

/** Limits and cleans everything that will be stored. Exported for tests. */
export function sanitizeSearch(input: CatalogSearchInput) {
  if (typeof input.query !== "string") return null;
  const query = input.query
    .replace(CONTROL, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  const key = query ? normalizePartKey(query) : null;
  if (!query || !key) return null;
  const count = Number.isFinite(input.resultCount)
    ? Math.max(0, Math.floor(input.resultCount))
    : 0;
  const topId =
    typeof input.topMatchId === "string" && input.topMatchId !== ""
      ? input.topMatchId.slice(0, 120)
      : null;
  const topScore =
    typeof input.topScore === "number" && Number.isFinite(input.topScore)
      ? input.topScore
      : null;
  return {
    key,
    query,
    source: input.source,
    resultCount: count,
    topMatchId: count > 0 ? topId : null,
    topScore: count > 0 ? topScore : null,
  };
}

function shouldSkip(request: HeaderSource): boolean {
  if (request.headers.get("dnt") === "1") return true;
  if (request.headers.get("sec-gpc") === "1") return true;
  return BOT_PATTERN.test(request.headers.get("user-agent") ?? "");
}

/** Best-effort, never throws. Counts one search per client per day per query. */
export async function recordCatalogSearch(
  input: CatalogSearchInput & { request: HeaderSource },
  now: Date = new Date(),
): Promise<void> {
  try {
    if (shouldSkip(input.request) || now.getTime() < pausedUntil) return;
    const cleaned = sanitizeSearch(input);
    if (!cleaned) return;

    const hash = clientHash(input.request, now);
    const dedupe = `${now.toISOString().slice(0, 10)}|${cleaned.key}|${hash}`;
    if (seen.has(dedupe)) return;
    if (seen.size >= MAX_SEEN) seen.clear();
    seen.add(dedupe);

    const { error } = await getSupabaseAdmin().rpc("record_catalog_search", {
      p_key: cleaned.key,
      p_query: cleaned.query,
      p_source: cleaned.source,
      p_result_count: cleaned.resultCount,
      p_top_match_id: cleaned.topMatchId,
      p_top_score: cleaned.topScore,
      p_client_hash: hash,
    });
    if (error) {
      seen.delete(dedupe);
      if (error.code && MISSING_CODES.has(error.code)) {
        pausedUntil = now.getTime() + BACKOFF_MS;
        if (!warned) {
          warned = true;
          console.warn("[searches] catalog_searches table or function missing; apply migration 0006");
        }
      }
    }
  } catch {
    // Must never affect the caller.
  }
}

/** Records after the response is sent when possible. */
export function recordCatalogSearchLater(
  input: CatalogSearchInput & { request: HeaderSource },
): void {
  const run = () => recordCatalogSearch(input);
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Deletes hit rows older than the given number of days. Best-effort. */
export async function purgeOldCatalogSearchHits(
  days = 180,
  now: Date = new Date(),
): Promise<void> {
  try {
    const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
    await getSupabaseAdmin().from("catalog_search_hits").delete().lt("day", cutoff);
  } catch {
    // Ignore.
  }
}

/** Test helper. */
export function resetSearchState(): void {
  seen.clear();
  pausedUntil = 0;
  warned = false;
}
