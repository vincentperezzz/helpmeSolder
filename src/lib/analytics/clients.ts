import { createHmac, createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { after } from "next/server";

export type ClientKind = "visitor" | "creator";

/** Rate limit for POST /api/hit (60 per hour per client). */
export const HIT_LIMIT = {
  bucket: "hit",
  limit: 60,
  windowMs: 60 * 60_000,
} as const;

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|preview/i;
const MAX_SEEN = 5000;
const BACKOFF_MS = 10 * 60_000;

type HeaderSource = { headers: { get(name: string): string | null } };

const seen = new Set<string>();
let pausedUntil = 0;
let warned = false;

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * One-way hash of the caller for one UTC day. The day key is an HMAC of the
 * date, so the same person gets a different hash every day and days cannot be
 * linked. The raw IP and user agent are never stored or returned.
 */
export function clientHash(request: HeaderSource, now: Date = new Date()): string {
  const secret =
    process.env.ANALYTICS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const dailyKey = createHmac("sha256", secret).update(utcDay(now)).digest("hex");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 200);
  return createHash("sha256")
    .update(`${dailyKey}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

function shouldSkip(request: HeaderSource): boolean {
  if (request.headers.get("dnt") === "1") return true;
  if (request.headers.get("sec-gpc") === "1") return true;
  return BOT_PATTERN.test(request.headers.get("user-agent") ?? "");
}

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/** Best-effort, never throws. Resolves once the write attempt is done. */
export async function recordClient(
  kind: ClientKind,
  request: HeaderSource,
  now: Date = new Date(),
): Promise<void> {
  try {
    if (shouldSkip(request) || now.getTime() < pausedUntil) return;

    const day = utcDay(now);
    const hash = clientHash(request, now);
    const key = `${day}|${kind}|${hash}`;
    if (seen.has(key)) return;
    if (seen.size >= MAX_SEEN) seen.clear();
    seen.add(key);

    const { error } = await getSupabaseAdmin()
      .from("daily_clients")
      .upsert(
        { day, kind, client_hash: hash },
        { onConflict: "day,kind,client_hash", ignoreDuplicates: true },
      );
    if (error) {
      seen.delete(key);
      if (isMissingTable(error)) {
        pausedUntil = now.getTime() + BACKOFF_MS;
        if (!warned) {
          warned = true;
          console.warn("[analytics] daily_clients table missing; apply migration 0004");
        }
      }
    }
  } catch {
    // Analytics must never affect the caller.
  }
}

/** Deletes rows older than the given number of days. Best-effort. */
export async function purgeOldClients(days = 90, now: Date = new Date()): Promise<void> {
  try {
    const cutoff = utcDay(new Date(now.getTime() - days * 86_400_000));
    await getSupabaseAdmin().from("daily_clients").delete().lt("day", cutoff);
  } catch {
    // Missing table or DB trouble: ignore.
  }
}

/** Test helper. */
export function resetAnalyticsState(): void {
  seen.clear();
  pausedUntil = 0;
  warned = false;
}

/** Records after the response is sent when possible, so the caller is never slowed. */
export function recordClientLater(kind: ClientKind, request: HeaderSource): void {
  const run = () => recordClient(kind, request);
  try {
    after(run);
  } catch {
    void run();
  }
}
