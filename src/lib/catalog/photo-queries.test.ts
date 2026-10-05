import { describe, expect, it } from "vitest";
import { listCatalog } from "./index";
import { partCategory } from "./part-media";
import { defaultQuery, photoQueriesFor } from "./photo-queries";

const all = () => {
  const c = listCatalog();
  return [...c.boards, ...c.modules, ...c.passives];
};

describe("photoQueriesFor", () => {
  it("has curated phrases for every catalog part", () => {
    for (const part of all()) {
      const q = photoQueriesFor(part, partCategory(part));
      expect(q.commons.length, part.id).toBeGreaterThan(0);
      expect(q.commons.length, part.id).toBeLessThanOrEqual(4);
      expect(q.openverse.length, part.id).toBeGreaterThan(0);
      // The generic fallback must not be what a curated part actually uses.
      expect(q.commons, part.id).not.toContain(defaultQuery(part.name, partCategory(part)));
    }
  });

  it("does not use the old query that found the wrong thing", () => {
    const pushbutton = all().find((p) => p.id === "passive.pushbutton")!;
    const q = photoQueriesFor(pushbutton, partCategory(pushbutton));
    expect(q.commons[0]).toMatch(/tactile/i);
  });

  it("falls back to name plus a noun for unknown parts", () => {
    expect(photoQueriesFor({ id: "x", name: "Mystery" }, "Sensor").commons).toEqual([
      "Mystery module",
    ]);
    expect(photoQueriesFor({ id: "x", name: "Mystery" }, "Board").commons).toEqual([
      "Mystery board",
    ]);
    expect(photoQueriesFor({ id: "x", name: "   " }, "Board")).toEqual({
      commons: [],
      wikipedia: [],
      openverse: [],
    });
  });
});
