import { describe, expect, it, vi } from "vitest";
import { openverseItem } from "./photo-fixtures";
import {
  buildOpenverseUrl,
  openverseLicenseName,
  searchOpenverse,
  shapeOpenverseResponse,
} from "./openverse";

const ID = "a1b2c3d4-0000-4000-8000-123456789abc";

describe("buildOpenverseUrl", () => {
  it("asks for reusable, non-mature images", () => {
    const url = new URL(buildOpenverseUrl("Arduino Uno -clone"));
    expect(url.origin + url.pathname).toBe("https://api.openverse.org/v1/images/");
    expect(url.searchParams.get("q")).toBe("Arduino Uno");
    expect(url.searchParams.get("license_type")).toBe("commercial,modification");
    expect(url.searchParams.get("mature")).toBe("false");
  });
});

describe("openverseLicenseName", () => {
  it("names licences like the other sources", () => {
    expect(openverseLicenseName("by", "2.0")).toBe("CC BY 2.0");
    expect(openverseLicenseName("by-sa", "4.0")).toBe("CC BY-SA 4.0");
    expect(openverseLicenseName("cc0", "1.0")).toBe("CC0 1.0");
    expect(openverseLicenseName("pdm", "1.0")).toBe("Public domain");
    expect(openverseLicenseName("by-nc", "4.0")).toBe("BY-NC");
  });
});

describe("shapeOpenverseResponse", () => {
  it("maps a result to the shared shape with plain-text credit", () => {
    const [photo] = shapeOpenverseResponse({ results: [openverseItem()] }, "Arduino Uno");
    expect(photo).toEqual({
      url: `https://api.openverse.org/v1/images/${ID}/thumb/`,
      thumbUrl: `https://api.openverse.org/v1/images/${ID}/thumb/`,
      title: "Arduino Uno board",
      author: "Sam Fox",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      sourceUrl: "https://www.flickr.com/photos/1/2",
      source: "openverse",
    });
  });

  it("skips mature, non-free, off-topic, odd-id and non-https results", () => {
    const out = shapeOpenverseResponse(
      {
        results: [
          openverseItem({ mature: true }),
          openverseItem({ license: "by-nc" }),
          openverseItem({ license: "by-nd" }),
          openverseItem({ title: "A cat" }),
          openverseItem({ id: "../../evil" }),
          openverseItem({ foreign_landing_url: "http://example.com/x" }),
          null,
        ],
      },
      "Arduino Uno",
    );
    expect(out).toEqual([]);
  });

  it("prefers Wikimedia and Flickr over other providers", () => {
    const out = shapeOpenverseResponse(
      {
        results: [
          openverseItem({
            id: "00000000-0000-4000-8000-000000000001",
            source: "other",
            title: "Arduino Uno a",
          }),
          openverseItem({
            id: "00000000-0000-4000-8000-000000000002",
            source: "wikimedia",
            title: "Arduino Uno b",
          }),
        ],
      },
      "Arduino Uno",
    );
    expect(out.map((p) => p.title)).toEqual(["Arduino Uno b", "Arduino Uno a"]);
  });

  it("copes with garbage", () => {
    expect(shapeOpenverseResponse(null, "x")).toEqual([]);
    expect(shapeOpenverseResponse({ results: "no" }, "x")).toEqual([]);
  });
});

describe("searchOpenverse", () => {
  it("returns an empty not-ok result on failure and never throws", async () => {
    const boom = vi.fn().mockRejectedValue(new Error("down"));
    expect(await searchOpenverse(["Arduino Uno"], boom)).toEqual({ images: [], ok: false });
    const limited = vi.fn().mockResolvedValue(new Response("slow down", { status: 429 }));
    expect(await searchOpenverse(["Arduino Uno"], limited)).toEqual({ images: [], ok: false });
  });
});
