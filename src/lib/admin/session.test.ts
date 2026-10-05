import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_MS,
  createSessionToken,
  verifySessionToken,
} from "./session";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  clearLoginFailures,
  clientKeyFromHeaders,
  isLoginBlocked,
  recordLoginFailure,
  resetLoginLimits,
} from "./login-limit";

describe("admin session token", () => {
  const now = 1_700_000_000_000;

  it("accepts a fresh token", () => {
    const { value } = createSessionToken("secret", now);
    expect(verifySessionToken(value, "secret", now + 1000)).toBe(true);
  });

  it("rejects an expired token", () => {
    const { value } = createSessionToken("secret", now);
    expect(verifySessionToken(value, "secret", now + ADMIN_SESSION_MS + 1)).toBe(false);
  });

  it("rejects a tampered expiry", () => {
    const { value } = createSessionToken("secret", now);
    const sig = value.split(".")[1];
    const forged = `${now + ADMIN_SESSION_MS * 2}.${sig}`;
    expect(verifySessionToken(forged, "secret", now)).toBe(false);
  });

  it("rejects a tampered signature, wrong secret and junk", () => {
    const { value } = createSessionToken("secret", now);
    const flipped = value.slice(0, -1) + (value.endsWith("0") ? "1" : "0");
    expect(verifySessionToken(flipped, "secret", now)).toBe(false);
    expect(verifySessionToken(value, "other", now)).toBe(false);
    expect(verifySessionToken(value, undefined, now)).toBe(false);
    expect(verifySessionToken("", "secret", now)).toBe(false);
    expect(verifySessionToken("abc", "secret", now)).toBe(false);
    expect(verifySessionToken("x.y", "secret", now)).toBe(false);
  });
});

describe("login throttle", () => {
  it("blocks after 5 failures and recovers after the window", () => {
    resetLoginLimits();
    const t = 1_000_000;
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      expect(isLoginBlocked("ip", t)).toBe(false);
      recordLoginFailure("ip", t + i);
    }
    expect(isLoginBlocked("ip", t + 10)).toBe(true);
    expect(isLoginBlocked("other", t + 10)).toBe(false);
    expect(isLoginBlocked("ip", t + LOGIN_WINDOW_MS + 10)).toBe(false);
    clearLoginFailures("ip");
    expect(isLoginBlocked("ip", t + 10)).toBe(false);
  });

  it("reads the client key from headers", () => {
    const h = (map: Record<string, string>) => (n: string) => map[n] ?? null;
    expect(clientKeyFromHeaders(h({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientKeyFromHeaders(h({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientKeyFromHeaders(h({}))).toBe("unknown");
  });
});
