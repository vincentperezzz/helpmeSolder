import { describe, expect, it } from "vitest";
import { getPartRevision } from "@/lib/catalog/registry";
import type { CatalogPart, GuidePart } from "@/lib/catalog/types";
import { buildPartView, partPhotosUrl } from "./PartCardView";

describe("partPhotosUrl", () => {
  it("adds the part revision as v", () => {
    expect(partPhotosUrl("board.arduino.uno")).toBe(
      `/api/part-photos?id=board.arduino.uno&v=${getPartRevision("board.arduino.uno")}`,
    );
    expect(partPhotosUrl("board.arduino.uno")).toMatch(/&v=[a-z0-9]{1,16}$/);
  });
});

describe("buildPartView", () => {
  const part = { instanceId: "i1", catalogId: "x.y", label: "" } as unknown as GuidePart;
  it("falls back from label to catalog name to id", () => {
    const catalog = { id: "x.y", name: "Thing", variants: [{}] } as unknown as CatalogPart;
    expect(buildPartView(part, catalog)).toMatchObject({ name: "Thing", hasVersions: true });
    expect(buildPartView(part, undefined)).toMatchObject({ name: "x.y", hasVersions: false });
    expect(buildPartView({ ...part, label: "Mine" }, catalog).name).toBe("Mine");
  });
});
