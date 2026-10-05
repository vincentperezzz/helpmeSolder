import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { PART_PHOTOS_LIMIT } from "@/lib/catalog/commons";
import { GET } from "./route";

const mk = (id?: string) =>
  new NextRequest(
    `http://localhost/api/part-photos${id === undefined ? "" : `?id=${encodeURIComponent(id)}`}`,
  );

const commonsBody = {
  query: {
    pages: {
      "1": {
        title: "File:Arduino Uno R3.jpg",
        index: 1,
        imageinfo: [
          {
            mime: "image/jpeg",
            thumburl: "https://upload.wikimedia.org/thumb/a/480px-a.jpg",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Arduino_Uno_R3.jpg",
            extmetadata: {
              LicenseShortName: { value: "CC BY 2.0" },
              Artist: { value: "<b>Sam</b>" },
            },
          },
        ],
      },
    },
  },
};

beforeEach(() => {
  resetRateLimits();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/part-photos", () => {
  it("rejects missing and unknown ids without calling Commons", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(mk())).status).toBe(404);
    const unknown = await GET(mk("https://evil.example/x"));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ images: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns shaped images with long cache headers for a known part", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(commonsBody), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(mk("board.arduino.uno"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=604800, stale-while-revalidate=86400",
    );
    const body = await res.json();
    expect(body.images).toHaveLength(1);
    expect(body.images[0]).toMatchObject({
      title: "Arduino Uno R3",
      author: "Sam",
      license: "CC BY 2.0",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("gsrsearch=Arduino+Uno+board");
  });

  it("returns an empty list with 200 and a short cache when Commons fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const res = await GET(mk("board.arduino.uno"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ images: [] });
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("returns 429 over the limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    for (let i = 0; i < PART_PHOTOS_LIMIT.limit; i++) await GET(mk("board.arduino.uno"));
    const res = await GET(mk("board.arduino.uno"));
    expect(res.status).toBe(429);
  });
});
