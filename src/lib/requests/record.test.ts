import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const maybeSingle = vi.fn();
const del = vi.fn();
const query = {
  select: () => query,
  eq: () => query,
  not: () => query,
  maybeSingle,
};
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    rpc,
    from: () => ({ ...query, delete: () => ({ lt: del }) }),
  }),
}));
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("outside request");
  },
}));

import {
  purgeOldRequestHits,
  recordPartRequest,
  recordPartRequestLater,
  resetRequestState,
  resolveAlias,
  sanitizeRequest,
} from "./record";

const req = (headers: Record<string, string> = {}) => ({
  headers: new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "Mozilla/5.0", ...headers }),
});
const now = new Date("2026-10-05T10:00:00Z");

beforeEach(() => {
  vi.stubEnv("ANALYTICS_SECRET", "s3");
  resetRequestState();
  rpc.mockReset().mockResolvedValue({ error: null });
  maybeSingle.mockReset();
  del.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sanitizeRequest", () => {
  it("limits lengths, strips control characters and caps pins", () => {
    const out = sanitizeRequest({
      name: "  Foo\u0000\nBar ".padEnd(200, "x"),
      note: "n\u0007ote".padEnd(500, "y"),
      kind: "sensor",
      source: "request_part",
      pins: Array.from({ length: 60 }, (_, i) => ({ id: `p${i}`.padEnd(80, "z"), label: "L" })),
    })!;
    expect(out.name.length).toBeLessThanOrEqual(80);
    expect(out.name).not.toMatch(/[\u0000-\u001f]/);
    expect(out.note!.length).toBe(200);
    expect(out.note).not.toMatch(/[\u0000-\u001f]/);
    expect(out.pins).toHaveLength(40);
    expect(out.pins![0].id.length).toBeLessThanOrEqual(30);
  });
  it("rejects empty names", () => {
    expect(sanitizeRequest({ name: " -- ", source: "add_part" })).toBeNull();
  });
});

describe("recordPartRequest", () => {
  it("calls the rpc with a daily hash and no raw identifiers", async () => {
    await recordPartRequest({ name: "BME280", source: "add_part", request: req() }, now);
    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe("record_part_request");
    expect(args).toMatchObject({ p_key: "bme280", p_display_name: "BME280", p_source: "add_part" });
    expect(args.p_client_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(args)).not.toContain("203.0.113.7");
  });
  it("dedupes per day, key and client", async () => {
    const input = { name: "BME280", source: "add_part" as const, request: req() };
    await recordPartRequest(input, now);
    await recordPartRequest(input, now);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("skips DNT, GPC and bots", async () => {
    await recordPartRequest({ name: "A1", source: "add_part", request: req({ dnt: "1" }) }, now);
    await recordPartRequest({ name: "A2", source: "add_part", request: req({ "sec-gpc": "1" }) }, now);
    await recordPartRequest({ name: "A3", source: "add_part", request: req({ "user-agent": "Googlebot" }) }, now);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("warns once and pauses when the function is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { code: "PGRST202" } });
    await recordPartRequest({ name: "A1", source: "add_part", request: req() }, now);
    await recordPartRequest({ name: "A2", source: "add_part", request: req() }, now);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    await recordPartRequest(
      { name: "A3", source: "add_part", request: req() },
      new Date(now.getTime() + 11 * 60_000),
    );
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("never throws", async () => {
    rpc.mockRejectedValue(new Error("boom"));
    await expect(
      recordPartRequest({ name: "A1", source: "add_part", request: req() }, now),
    ).resolves.toBeUndefined();
    expect(() =>
      recordPartRequestLater({ name: "A2", source: "add_part", request: req() }),
    ).not.toThrow();
  });
});

describe("resolveAlias", () => {
  it("returns the mapped id and caches for 60 seconds", async () => {
    maybeSingle.mockResolvedValue({ data: { mapped_catalog_id: "module.dht22" }, error: null });
    expect(await resolveAlias("DHT 22 sensor", 1000)).toBe("module.dht22");
    expect(await resolveAlias("dht22sensor", 30_000)).toBe("module.dht22");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    await resolveAlias("DHT 22 sensor", 62_000);
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
  it("returns null when unmapped, on errors and on throws", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await resolveAlias("nothing")).toBeNull();
    maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "42P01" } });
    expect(await resolveAlias("other")).toBeNull();
    maybeSingle.mockRejectedValueOnce(new Error("x"));
    expect(await resolveAlias("third")).toBeNull();
    expect(await resolveAlias("")).toBeNull();
  });
});

describe("purgeOldRequestHits", () => {
  it("deletes rows older than 180 days and ignores failures", async () => {
    await purgeOldRequestHits(180, now);
    expect(del).toHaveBeenCalledWith("day", "2026-04-08");
    del.mockRejectedValue(new Error("x"));
    await expect(purgeOldRequestHits(180, now)).resolves.toBeUndefined();
  });
});
