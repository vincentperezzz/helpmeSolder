import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

let warnedMissingKey = false;

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time string comparison (both sides hashed so lengths are equal). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

/** Extracts the presented API token from `Authorization: Bearer` or `x-api-key`. */
export function getApiToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return request.headers.get("x-api-key");
}

/**
 * Returns a Response to short-circuit with, or null when the request may proceed.
 * - MCP_API_KEY unset + NODE_ENV=production: fails closed with 503.
 * - MCP_API_KEY unset elsewhere: allowed, with a one-time console warning.
 * - MCP_API_KEY set: token must match (401 otherwise).
 */
export function assertApiAuth(request: NextRequest): Response | null {
  const expected = process.env.MCP_API_KEY;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("MCP_API_KEY is not set; refusing API requests in production.");
      return Response.json(
        { error: "API authentication is not configured" },
        { status: 503 },
      );
    }
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[api/auth] MCP_API_KEY is not set; API is unauthenticated (allowed outside production only).",
      );
    }
    return null;
  }

  const token = getApiToken(request);
  if (!token || !safeEqual(token, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
