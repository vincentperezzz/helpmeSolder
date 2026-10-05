import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const del = vi.fn();
const from = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({ rpc, from }),
}));
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("outside request");
  },
}));

import {
  purgeOldCatalogSearchHits,
  recordCatalogSearch,
  recordCatalogSearchLater,
  resetSearchState,
  sanitizeSearch,
} from "./search";

const req = (headers: Record<string, string> = {}) => ({
  headers: new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "Mozilla/5.0", ...headers }),
});
const now = new Date("2026-10-05T10:00:00Z");
const base = { source: "search_catalog" as const, resultCount: 0 };

beforeEach(() => {
  vi.stubEnv("ANALYTICS_SECRET", "s3");
  resetSearchState();
  rpc.mockReset().mockResolvedValue({ error: null });
  del.mockReset().mockResolvedValue({ error: null });
  from.mockReset().mockReturnValue({ delete: () => ({ lt: del }) });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sanitizeSearch", () => {
  it("trims, strips control characters and caps at 80", () => {
    const out = sanitizeSearch({ ...base, query: "  bat\u0000te\nry ".padEnd(200, "x") })!;
    expect(out.query.length).toBeLessThanOrEqual(80);
    expect(out.query).not.toMatch(/[\u0000-\u001f]/);
    expect(out.query.startsWith("bat te ry")).toBe(true);
  });
  it("skips empty text", () => {
    expect(sanitizeSearch({ ...base, query: "   " })).toBeNull();
    expect(sanitizeSearch({ ...base, query: " -- " })).toBeNull();
  });
  it("shares one key across case and spacing", () => {
    const keys = ["Battery", "battery ", "BATTERY"].map(
      (query) => sanitizeSearch({ ...base, query })!.key,
    );
    expect(new Set(keys).size).toBe(1);
  });
  it("drops the top match when nothing matched", () => {
    const out = sanitizeSearch({ ...base, query: "x1", resultCount: 0, topMatchId: "a", topScore: 0.9 })!;
    expect(out.topMatchId).toBeNull();
    expect(out.topScore).toBeNull();
  });
});

describe("recordCatalogSearch", () => {
  it("calls the rpc with the outcome and a daily hash, no raw identifiers", async () => {
    await recordCatalogSearch(
      {
        query: "DHT22",
        source: "search_catalog",
        resultCount: 3,
        topMatchId: "module.dht22",
        topScore: 1,
        request: req(),
      },
      now,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe("record_catalog_search");
    expect(args).toMatchObject({
      p_key: "dht22",
      p_query: "DHT22",
      p_source: "search_catalog",
      p_result_count: 3,
      p_top_match_id: "module.dht22",
      p_top_score: 1,
    });
    expect(args.p_client_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(args)).not.toContain("203.0.113.7");
  });

  it("skips DNT, GPC and bots", async () => {
    const cases: Record<string, string>[] = [{ dnt: "1" }, { "sec-gpc": "1" }, { "user-agent": "Googlebot/2.1" }];
    for (const headers of cases) {
      await recordCatalogSearch({ ...base, query: "battery", request: req(headers) }, now);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not record empty text", async () => {
    await recordCatalogSearch({ ...base, query: "  ", request: req() }, now);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("dedupes the same query per client per day", async () => {
    await recordCatalogSearch({ ...base, query: "Battery", request: req() }, now);
    await recordCatalogSearch({ ...base, query: "battery ", request: req() }, now);
    expect(rpc).toHaveBeenCalledTimes(1);
    await recordCatalogSearch(
      { ...base, query: "BATTERY", request: req() },
      new Date("2026-10-06T10:00:00Z"),
    );
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("never throws and allows a retry after an error", async () => {
    rpc.mockRejectedValueOnce(new Error("boom"));
    await expect(
      recordCatalogSearch({ ...base, query: "battery", request: req() }, now),
    ).resolves.toBeUndefined();
    rpc.mockResolvedValueOnce({ error: { code: "XX000" } });
    await expect(
      recordCatalogSearch({ ...base, query: "led", request: req() }, now),
    ).resolves.toBeUndefined();
    await recordCatalogSearch({ ...base, query: "led", request: req() }, now);
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("warns once and pauses 10 minutes when the function is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { code: "PGRST202" } });
    await recordCatalogSearch({ ...base, query: "battery", request: req() }, now);
    await recordCatalogSearch(
      { ...base, query: "led", request: req() },
      new Date(now.getTime() + 60_000),
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    await recordCatalogSearch(
      { ...base, query: "led", request: req() },
      new Date(now.getTime() + 11 * 60_000),
    );
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("runs directly when there is no request scope", async () => {
    recordCatalogSearchLater({ ...base, query: "battery", request: req() });
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
  });
});

describe("purgeOldCatalogSearchHits", () => {
  it("deletes hits older than the cutoff day", async () => {
    await purgeOldCatalogSearchHits(180, now);
    expect(from).toHaveBeenCalledWith("catalog_search_hits");
    expect(del).toHaveBeenCalledWith("day", "2026-04-08");
  });
  it("never throws", async () => {
    from.mockImplementation(() => {
      throw new Error("down");
    });
    await expect(purgeOldCatalogSearchHits(180, now)).resolves.toBeUndefined();
  });
});
