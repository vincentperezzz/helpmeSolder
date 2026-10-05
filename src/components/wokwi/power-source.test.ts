import { describe, expect, it } from "vitest";
import { captionLineCount } from "@/components/BatteryAssets";
import { BATTERY_ASSETS } from "@/lib/catalog/batteries";
import { POWER_ORIGIN } from "./constants";
import { BATTERY_WIRE_ANCHORS, batteryBlockHeight } from "./PowerSourceVisual";

describe("battery block", () => {
  it("wraps captions by words inside the drawing width", () => {
    expect(captionLineCount("short", 160)).toBe(1);
    expect(captionLineCount("2×AA — + nub on top, − flat on bottom", 160)).toBeGreaterThanOrEqual(2);
    expect(captionLineCount("a".repeat(45), 160)).toBe(3);
  });
  it("reserves room for every wrapped caption line", () => {
    for (const asset of Object.values(BATTERY_ASSETS)) {
      expect(batteryBlockHeight(asset)).toBeGreaterThan(asset.height + 18);
    }
  });
  it("sends cell-pack minus wires sideways, clear of the caption below", () => {
    expect(BATTERY_WIRE_ANCHORS.battery_2aa.minusExit).toEqual({ dx: 1, dy: 0 });
    expect(BATTERY_WIRE_ANCHORS.battery_18650.minusExit).toEqual({ dx: 1, dy: 0 });
    expect(BATTERY_WIRE_ANCHORS.battery_9v.minusExit.dy).toBe(-1);
  });
  it("has wire anchors for every power source, offset by the drawing origin", () => {
    for (const [kind, asset] of Object.entries(BATTERY_ASSETS)) {
      const anchors = BATTERY_WIRE_ANCHORS[kind as keyof typeof BATTERY_WIRE_ANCHORS];
      expect(anchors, kind).toBeDefined();
      expect(anchors.plus.x - POWER_ORIGIN.x).toBe(asset.terminals.plus.x);
      expect(anchors.plus.y - POWER_ORIGIN.y).toBe(asset.terminals.plus.y);
      expect(anchors.minus.x - POWER_ORIGIN.x).toBe(asset.terminals.minus.x);
      expect(anchors.minus.y - POWER_ORIGIN.y).toBe(asset.terminals.minus.y);
      expect(anchors.plusExit).toEqual(asset.terminals.plusExit);
      // Any minus tab below the cells sends its wire sideways, clear of the caption.
      if (asset.terminals.minusExit.dy > 0) expect(anchors.minusExit).toEqual({ dx: 1, dy: 0 });
      else expect(anchors.minusExit).toEqual(asset.terminals.minusExit);
    }
  });
  it("puts new packs' terminals on the right side for odd and even cell counts", () => {
    // Even counts: both leads leave from the top. Odd counts: + on top, - below the cells.
    expect(BATTERY_ASSETS.battery_4aa.terminals.minusExit).toEqual({ dx: 0, dy: -1 });
    expect(BATTERY_ASSETS.battery_6aa_nimh.terminals.minusExit).toEqual({ dx: 0, dy: -1 });
    expect(BATTERY_ASSETS.battery_3aaa.terminals.minusExit).toEqual({ dx: 0, dy: 1 });
    expect(BATTERY_ASSETS.battery_1d.terminals.minusExit).toEqual({ dx: 0, dy: 1 });
    expect(BATTERY_ASSETS.battery_cr2032.terminals.plusExit).toEqual({ dx: 0, dy: -1 });
    expect(BATTERY_ASSETS.supply_barrel_12v.terminals.plusExit).toEqual({ dx: 1, dy: 0 });
    // + is always the left-most terminal of a cell pack, - the right-most (even) or lowest (odd).
    expect(BATTERY_ASSETS.battery_4aa.terminals.plus.x).toBeLessThan(BATTERY_ASSETS.battery_4aa.terminals.minus.x);
    expect(BATTERY_ASSETS.battery_3aaa.terminals.minus.y).toBeGreaterThan(BATTERY_ASSETS.battery_3aaa.terminals.plus.y);
  });
});
