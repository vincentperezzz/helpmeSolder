import { describe, expect, it } from "vitest";
import type { AssetRecord } from "@/lib/catalog/asset-registry";
import {
  assetsHref,
  badgesFor,
  categoriesOf,
  drawingLabel,
  filterRecords,
  genericUsage,
  parseShow,
  summarize,
  thumbnailFilePath,
} from "./asset-view";

const base: AssetRecord = {
  partId: "a", name: "Alpha", category: "Sensor", photoHint: null, thumbnailUrl: "/photos/a.jpg",
  thumbnailFormat: "jpg", thumbnailSource: "photo", drawingUrl: null, drawingKind: "wokwi-element",
  drawingRef: "wokwi-dht22", usesGeneric: false, genericRef: null, license: null, issues: [],
};
const gen: AssetRecord = {
  ...base, partId: "b", name: "Beta", category: "Output", thumbnailUrl: "/assets/g.svg",
  thumbnailSource: "generic", usesGeneric: true, genericRef: "skeleton:output",
  drawingKind: "skeleton", drawingRef: null,
};
const none: AssetRecord = {
  ...base, partId: "c", name: "Gamma", thumbnailUrl: null, thumbnailSource: "none",
  thumbnailFormat: null, issues: ["No thumbnail"],
};
const all = [base, gen, none];

describe("asset-view", () => {
  it("summarizes", () => {
    expect(summarize(all)).toEqual({
      parts: 3, withPhoto: 1, withIllustration: 0, generic: 1, missing: 1, skeletonDrawings: 1,
    });
  });
  it("parses show", () => {
    expect(parseShow("missing")).toBe("missing");
    expect(parseShow("zzz")).toBe("all");
    expect(parseShow(undefined)).toBe("all");
  });
  it("filters", () => {
    const ids = (show: "all" | "missing" | "generic" | "issues", cat = "", q = "") =>
      filterRecords(all, { cat, show, q }).map((r) => r.partId);
    expect(ids("missing")).toEqual(["c"]);
    expect(ids("generic")).toEqual(["b"]);
    expect(ids("issues")).toEqual(["c"]);
    expect(ids("all", "Sensor")).toEqual(["a", "c"]);
    expect(ids("all", "", " ALP ")).toEqual(["a"]);
  });
  it("lists categories", () => expect(categoriesOf(all)).toEqual(["Output", "Sensor"]));
  it("counts generic usage", () => {
    const u = genericUsage([gen, { ...gen, partId: "d", name: "Delta" }, base]);
    expect(u).toEqual([
      { ref: "skeleton:output", count: 2, previewUrl: "/assets/g.svg", partNames: ["Beta", "Delta"] },
    ]);
  });
  it("labels drawings", () => {
    expect(drawingLabel(base)).toBe("Wokwi element: wokwi-dht22");
    expect(drawingLabel({ drawingKind: "builtin", drawingRef: null })).toBe("Built-in drawing");
    expect(drawingLabel(gen)).toBe("Generic skeleton");
  });
  it("builds file paths", () => {
    expect(thumbnailFilePath("/photos/a.jpg")).toBe("public/photos/a.jpg");
    expect(thumbnailFilePath(null)).toBeNull();
    expect(thumbnailFilePath("https://x.test/a.png")).toBe("https://x.test/a.png");
  });
  it("badges", () => {
    expect(badgesFor(base).map((b) => b.label)).toEqual(["Photo"]);
    expect(badgesFor(gen).map((b) => b.label)).toEqual(["Generic"]);
    expect(badgesFor(none).map((b) => b.label)).toEqual(["Missing"]);
  });
  it("builds hrefs", () => {
    expect(assetsHref({})).toBe("/admin/assets");
    expect(assetsHref({ cat: "Sensor", show: "generic", q: "a b" })).toBe(
      "/admin/assets?cat=Sensor&show=generic&q=a+b",
    );
  });
});

describe("view param", () => {
  it("parses and keeps the view in links", async () => {
    const { parseView } = await import("./asset-view");
    expect(parseView("list")).toBe("list");
    expect(parseView("x")).toBe("grid");
    expect(assetsHref({ view: "list", show: "missing" })).toBe("/admin/assets?show=missing&view=list");
    expect(assetsHref({ view: "grid" })).toBe("/admin/assets");
  });
});
