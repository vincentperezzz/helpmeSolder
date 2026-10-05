import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/api/auth";

export const ADMIN_COOKIE = "hms_admin";
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;

export type SessionLevel = "full" | "restricted";

function sign(expiry: number, secret: string, restricted: boolean): string {
  return createHmac("sha256", secret)
    .update(`admin:${expiry}:${restricted ? "d" : "f"}`)
    .digest("hex");
}

/**
 * Cookie value: `<expiry ms>.<sig>` for a full session, or
 * `<expiry ms>.d.<sig>` for a restricted one (signed in with the default
 * password). The signature is an HMAC-SHA256 over the expiry and the
 * restricted flag, keyed with a secret derived from the active password.
 */
export function createSessionToken(
  secret: string,
  now: number = Date.now(),
  restricted = false,
): { value: string; expires: number } {
  const expires = now + ADMIN_SESSION_MS;
  const sig = sign(expires, secret, restricted);
  return { value: restricted ? `${expires}.d.${sig}` : `${expires}.${sig}`, expires };
}

/** The level of an untampered, unexpired token made with this secret, else null. */
export function readSessionToken(
  token: string | undefined | null,
  secret: string | undefined,
  now: number = Date.now(),
): SessionLevel | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2 && parts.length !== 3) return null;
  const restricted = parts.length === 3;
  if (restricted && parts[1] !== "d") return null;
  const expiryText = parts[0];
  const signature = parts[parts.length - 1];
  if (!/^\d{1,15}$/.test(expiryText)) return null;
  const expiry = Number(expiryText);
  // Compare the signature first (constant time), then check time bounds.
  const signatureOk = safeEqual(signature, sign(expiry, secret, restricted));
  const notExpired = expiry > now;
  // A token can never be valid for longer than the session length.
  const withinMax = expiry - now <= ADMIN_SESSION_MS;
  if (!(signatureOk && notExpired && withinMax)) return null;
  return restricted ? "restricted" : "full";
}

/** True only for an untampered, unexpired FULL session token made with this secret. */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string | undefined,
  now: number = Date.now(),
): boolean {
  return readSessionToken(token, secret, now) === "full";
}
