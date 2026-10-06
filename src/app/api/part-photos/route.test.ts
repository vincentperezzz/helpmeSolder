import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { PART_PHOTOS_LIMIT } from "@/lib/catalog/commons";
import { page, wrap } from "@/lib/catalog/photo-fixtures";
import { CACHE_EMPTY, CACHE_FAILED, CACHE_FOUND } from "@/lib/catalog/photo-cache";
import { GET } from "./route";

const mk = (id?: string, v?: string) =>
  new NextRequest(
    `http://localhost/api/part-photos${id === undefined ? "" : `?id=${encodeURIComponent(id)}`}${v === undefined ? "" : `&v=${encodeURIComponent(v)}`}`,
  );

const reply = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  resetRateLimits();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/part-photos", () => {
  it("rejects missing and unknown ids without calling any source", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(mk())).status).toBe(404);
    const unknown = await GET(mk("https://evil.example/x"));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ images: [] });
    expect(unknown.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns shaped images with a long cache for a known part", async () => {
    const fetchMock = vi.fn().mockImplementation(
      reply(wrap(page("File:Arduino Uno R3.jpg", { license: "CC BY 2.0", artist: "<b>Sam</b>" }))),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(mk("board.arduino.uno"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(CACHE_FOUND);
    const body = await res.json();
    expect(body.images[0]).toMatchObject({
      title: "Arduino Uno R3",
      author: "Sam",
      license: "CC BY 2.0",
      source: "commons",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("gsrsearch=Arduino+Uno+R3");
  });

  it("never gives an empty answer the long cache (regression: empty pinned for a week)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(reply({ query: {} })));
    const res = await GET(mk("board.arduino.uno"));
    expect(await res.json()).toEqual({ images: [] });
    const cache = res.headers.get("Cache-Control") ?? "";
    expect(cache).toBe(CACHE_EMPTY);
    expect(cache).not.toContain("604800");
    expect(cache).toContain("s-maxage=300");
  });

  it("returns an empty list with 200 and no caching when every source fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const res = await GET(mk("board.arduino.uno"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ images: [] });
    expect(res.headers.get("Cache-Control")).toBe(CACHE_FAILED);
  });

  it("accepts a well-formed v and ignores it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(reply({ query: {} })));
    for (const v of ["s", "r12", "abc123"]) {
      const res = await GET(mk("board.arduino.uno", v));
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(CACHE_EMPTY);
    }
  });

  it("rejects a malformed v with 400 and calls no source", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const v of ["", "R1", "a-b", "x".repeat(17), "<script>"]) {
      const res = await GET(mk("board.arduino.uno", v));
      expect(res.status).toBe(400);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns photos for a deprecated part too", async () => {
    // getCatalogPart includes deprecated parts; the route uses it, not listCatalog.
    vi.stubGlobal("fetch", vi.fn().mockImplementation(reply({ query: {} })));
    expect((await GET(mk("board.arduino.uno"))).status).toBe(200);
  });

  it("returns 429 over the limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(reply({})));
    for (let i = 0; i < PART_PHOTOS_LIMIT.limit; i++) await GET(mk("board.arduino.uno"));
    const res = await GET(mk("board.arduino.uno"));
    expect(res.status).toBe(429);
  });
});
