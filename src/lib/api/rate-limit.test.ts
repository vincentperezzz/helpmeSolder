import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CREATE_LIMIT,
  WRITE_LIMIT,
  checkRateLimit,
  getClientKey,
  resetRateLimits,
} from "./rate-limit";

const req = (headers: Record<string, string> = { "x-forwarded-for": "1.1.1.1" }) =>
  new NextRequest("http://localhost/api/x", { headers });

const opts = { bucket: "t", limit: 3, windowMs: 10_000 };

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => vi.unstubAllEnvs());

  it("allows up to the limit then returns 429 with Retry-After", async () => {
    for (let i = 0; i < 3; i++) expect(checkRateLimit(req(), opts, 1000 + i)).toBeNull();
    const res = checkRateLimit(req(), opts, 4000)!;
    expect(res.status).toBe(429);
    // oldest hit at 1000, window 10s -> frees at 11000; now 4000 -> 7s
    expect(res.headers.get("Retry-After")).toBe("7");
    expect(await res.json()).toEqual({ error: "Too many requests", retryAfterSeconds: 7 });
  });

  it("window slides", () => {
    for (let i = 0; i < 3; i++) checkRateLimit(req(), opts, 1000);
    expect(checkRateLimit(req(), opts, 5000)?.status).toBe(429);
    expect(checkRateLimit(req(), opts, 11_001)).toBeNull();
  });

  it("separates clients and buckets", () => {
    for (let i = 0; i < 3; i++) checkRateLimit(req(), opts, 1000);
    expect(checkRateLimit(req({ "x-forwarded-for": "2.2.2.2" }), opts, 1000)).toBeNull();
    expect(checkRateLimit(req(), { ...opts, bucket: "other" }, 1000)).toBeNull();
  });

  it("keys by API token when present", () => {
    expect(getClientKey(req({ "x-api-key": "abc" }))).toMatch(/^key:/);
    expect(getClientKey(req({ "x-real-ip": "9.9.9.9" }))).toBe("ip:9.9.9.9");
    expect(getClientKey(req({}))).toBe("ip:unknown");
  });

  it("resetRateLimits clears state", () => {
    for (let i = 0; i < 3; i++) checkRateLimit(req(), opts, 1000);
    resetRateLimits();
    expect(checkRateLimit(req(), opts, 1000)).toBeNull();
  });

  it("has defaults of 20/hour create and 60/min write", () => {
    expect(CREATE_LIMIT.limit).toBe(20);
    expect(CREATE_LIMIT.windowMs).toBe(3_600_000);
    expect(WRITE_LIMIT.limit).toBe(60);
    expect(WRITE_LIMIT.windowMs).toBe(60_000);
  });

  it("env vars override limits; invalid values fall back", () => {
    vi.stubEnv("RATE_LIMIT_CREATE_PER_HOUR", "2");
    vi.stubEnv("RATE_LIMIT_WRITE_PER_MIN", "5");
    expect(CREATE_LIMIT.limit).toBe(2);
    expect(WRITE_LIMIT.limit).toBe(5);
    expect(checkRateLimit(req(), CREATE_LIMIT, 1)).toBeNull();
    expect(checkRateLimit(req(), CREATE_LIMIT, 2)).toBeNull();
    expect(checkRateLimit(req(), CREATE_LIMIT, 3)?.status).toBe(429);
    vi.stubEnv("RATE_LIMIT_CREATE_PER_HOUR", "abc");
    vi.stubEnv("RATE_LIMIT_WRITE_PER_MIN", "-4");
    expect(CREATE_LIMIT.limit).toBe(20);
    expect(WRITE_LIMIT.limit).toBe(60);
  });
});
