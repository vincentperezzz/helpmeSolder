import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getApiToken } from "./auth";

/**
 * In-memory sliding-window rate limiter.
 *
 * NOTE: state lives in module memory, so it is per server instance and
 * best-effort only. On Vercel (serverless) each warm lambda keeps its own
 * counters and cold starts reset them; use a shared store (e.g. Upstash/Redis)
 * or Vercel Firewall rules for hard guarantees.
 */

type Options = {
  /** Logical bucket name, so endpoints have independent counters. */
  bucket: string;
  limit: number;
  windowMs: number;
};

const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Default limits (override with env vars). */
export const WRITE_LIMIT = {
  bucket: "write",
  get limit() {
    return envInt("RATE_LIMIT_WRITE_PER_MIN", 60);
  },
  windowMs: 60_000,
} satisfies Options;

export const CREATE_LIMIT = {
  bucket: "create",
  get limit() {
    return envInt("RATE_LIMIT_CREATE_PER_HOUR", 20);
  },
  windowMs: 60 * 60_000,
} satisfies Options;

export function getClientKey(request: NextRequest): string {
  const token = getApiToken(request);
  if (token) {
    return `key:${createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/** Returns a 429 Response when over the limit, otherwise records the hit and returns null. */
export function checkRateLimit(
  request: NextRequest,
  options: Options,
  now: number = Date.now(),
): Response | null {
  const key = `${options.bucket}:${getClientKey(request)}`;
  const windowStart = now - options.windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= options.limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((recent[0] + options.windowMs - now) / 1000),
    );
    hits.set(key, recent);
    return Response.json(
      { error: "Too many requests", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  recent.push(now);
  if (!hits.has(key) && hits.size >= MAX_KEYS) {
    // Evict the oldest key to bound memory.
    const oldest = hits.keys().next().value;
    if (oldest !== undefined) hits.delete(oldest);
  }
  hits.set(key, recent);
  return null;
}

/** Test helper. */
export function resetRateLimits(): void {
  hits.clear();
}
