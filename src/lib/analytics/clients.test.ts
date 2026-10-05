import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({ from: () => ({ upsert }) }),
}));

import { clientHash, recordClient, resetAnalyticsState } from "./clients";

const req = (headers: Record<string, string> = {}) => ({
  headers: new Headers({
    "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    "user-agent": "Mozilla/5.0 Firefox",
    ...headers,
  }),
});
const day1 = new Date("2026-10-05T10:00:00Z");
const day2 = new Date("2026-10-06T10:00:00Z");

beforeEach(() => {
  vi.stubEnv("ANALYTICS_SECRET", "s3");
  resetAnalyticsState();
  upsert.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("clientHash", () => {
  it("is stable within a day and 32 hex chars", () => {
    const h = clientHash(req(), day1);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(clientHash(req(), new Date("2026-10-05T23:59:00Z"))).toBe(h);
  });
  it("differs across days, IPs and user agents", () => {
    const h = clientHash(req(), day1);
    expect(clientHash(req(), day2)).not.toBe(h);
    expect(clientHash(req({ "x-forwarded-for": "198.51.100.1" }), day1)).not.toBe(h);
    expect(clientHash(req({ "user-agent": "Other" }), day1)).not.toBe(h);
  });
  it("contains no raw IP or user agent", () => {
    const h = clientHash(req(), day1);
    expect(h).not.toContain("203");
    expect(h).not.toContain("Mozilla");
  });
  it("falls back to the service role key", () => {
    const a = clientHash(req(), day1);
    vi.stubEnv("ANALYTICS_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    expect(clientHash(req(), day1)).not.toBe(a);
  });
});

describe("recordClient", () => {
  it("upserts one row with ignoreDuplicates and dedupes repeats", async () => {
    await recordClient("visitor", req(), day1);
    await recordClient("visitor", req(), day1);
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0];
    expect(row).toMatchObject({ day: "2026-10-05", kind: "visitor" });
    expect(JSON.stringify(row)).not.toContain("203.0.113.7");
    expect(opts).toMatchObject({ ignoreDuplicates: true });
    await recordClient("creator", req(), day1);
    expect(upsert).toHaveBeenCalledTimes(2);
  });
  it("skips DNT, GPC and bots", async () => {
    await recordClient("visitor", req({ dnt: "1" }), day1);
    await recordClient("visitor", req({ "sec-gpc": "1" }), day1);
    await recordClient("visitor", req({ "user-agent": "Googlebot/2.1" }), day1);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("never throws when the DB throws or errors", async () => {
    upsert.mockRejectedValueOnce(new Error("boom"));
    await expect(recordClient("visitor", req(), day1)).resolves.toBeUndefined();
    upsert.mockResolvedValueOnce({ error: { code: "XX000" } });
    await expect(
      recordClient("visitor", req({ "user-agent": "b" }), day1),
    ).resolves.toBeUndefined();
  });
  it("warns once and pauses for 10 minutes when the table is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    upsert.mockResolvedValue({ error: { code: "42P01" } });
    await recordClient("visitor", req({ "user-agent": "a" }), day1);
    await recordClient("visitor", req({ "user-agent": "b" }), day1);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    await recordClient("visitor", req({ "user-agent": "c" }), new Date(day1.getTime() + 11 * 60_000));
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
