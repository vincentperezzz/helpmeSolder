import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDiagramAsset, prefersDiagramAsset } from "./board-assets";
import { getCatalogPart } from "./index";
import { GENERATED_BOARD_ASSETS, GENERATED_MODULE_ASSETS } from "./part-drawings.generated";

const generated = { ...GENERATED_BOARD_ASSETS, ...GENERATED_MODULE_ASSETS };

describe("generated part drawings", () => {
  for (const [id, asset] of Object.entries(generated)) {
    describe(id, () => {
      const part = getCatalogPart(id);

      it("belongs to a catalog part and is the drawing the diagram uses", () => {
        expect(part).toBeDefined();
        expect(getDiagramAsset(id)).toBe(asset);
        expect(prefersDiagramAsset(id, Boolean(part?.wokwi?.tag))).toBe(true);
      });

      it("has its SVG file on disk", () => {
        expect(existsSync(path.join(process.cwd(), "public", asset.src))).toBe(true);
      });

      it("gives every catalog pin a terminal inside the drawing", () => {
        for (const pin of part?.pins ?? []) {
          const point = asset.terminals?.[pin.id];
          expect(point, `${id} pin ${pin.id}`).toBeDefined();
          expect(point!.x).toBeGreaterThanOrEqual(0);
          expect(point!.x).toBeLessThanOrEqual(asset.width);
          expect(point!.y).toBeGreaterThanOrEqual(0);
          expect(point!.y).toBeLessThanOrEqual(asset.height);
        }
      });
    });
  }
});
