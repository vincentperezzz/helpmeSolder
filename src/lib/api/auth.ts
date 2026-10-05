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
 * - A presented token must match MCP_API_KEY when it is set (401 otherwise).
 * - No token: allowed when ALLOW_PUBLIC_API=true (rate limits still apply).
 * - No token, MCP_API_KEY set, public access off: 401.
 * - No token, no key, public access off: 503 in production, allowed (with a
 *   one-time warning) elsewhere.
 */
export function assertApiAuth(request: NextRequest): Response | null {
  const expected = process.env.MCP_API_KEY;
  const token = getApiToken(request);

  if (expected && token) {
    return safeEqual(token, expected)
      ? null
      : Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.ALLOW_PUBLIC_API === "true") {
    return null;
  }

  if (expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "Neither MCP_API_KEY nor ALLOW_PUBLIC_API is set; refusing API requests in production.",
    );
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
