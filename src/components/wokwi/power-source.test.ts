import { describe, expect, it } from "vitest";
import { captionLineCount } from "@/components/BatteryAssets";
import { BATTERY_ASSETS } from "@/lib/catalog/batteries";
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
});
