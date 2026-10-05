import { describe, expect, it } from "vitest";
import {
  SAFE_MARGIN,
  canvasFromBounds,
  clampRectInto,
  computeContentBounds,
  computeFit,
  rectInside,
  sceneBounds,
  worldFromBounds,
} from "./bounds";
import { labelRect } from "./labels";
import type { Rect, Wire } from "./types";

function wire(id: string, points: { x: number; y: number }[], label: string, mid = points[0]): Wire {
  return {
    id,
    label,
    showLabel: true,
    color: "#000",
    d: "",
    mid,
    from: points[0],
    to: points[points.length - 1],
    points,
  };
}

describe("content bounds with negative and far coordinates", () => {
  it("covers every part, wire point and label box on both sides", () => {
    const parts: Rect[] = [
      { x: 100, y: 100, w: 50, h: 40 },
      { x: -300, y: -120, w: 80, h: 60 },
      { x: 2400, y: 1900, w: 90, h: 50 },
    ];
    const farLabel = wire("a", [{ x: 0, y: 0 }, { x: 10, y: 0 }], "Buzzer signal to GPIO D5", { x: 3000, y: -80 });
    const leftLabel = wire("b", [{ x: 0, y: 0 }, { x: 10, y: 0 }], "Button ground to ESP32 GND", { x: -500, y: 40 });
    const bounds = sceneBounds({ wires: [farLabel, leftLabel], partRects: parts });
    expect(bounds).not.toBeNull();
    if (!bounds) return;
    const farBox = labelRect(farLabel.mid, farLabel.label);
    const leftBox = labelRect(leftLabel.mid, leftLabel.label);
    for (const rect of [...parts, farBox, leftBox]) {
      expect(rectInside(rect, bounds)).toBe(true);
    }
    expect(bounds.minX).toBe(leftBox.x);
    expect(bounds.maxX).toBe(farBox.x + farBox.w);
    expect(bounds.minY).toBe(-120);
    expect(bounds.maxY).toBe(1950);
  });

  it("includes a badge and the stroke width of wires at the edge", () => {
    const w = wire("a", [{ x: -40, y: -40 }, { x: 10, y: -40 }], "x");
    w.showLabel = false;
    w.badge = { x: -60, y: 0 };
    const bounds = sceneBounds({ wires: [w], partRects: [] });
    expect(bounds?.minX).toBeLessThan(-60);
    expect(bounds?.minY).toBeLessThan(-40);
  });

  it("shifts the world so nothing starts left of or above the safe margin, and sizes it to max plus margin", () => {
    const bounds = computeContentBounds({
      rects: [{ x: -500, y: -200, w: 100, h: 50 }],
      points: [{ x: 2900, y: 1500 }],
      pointPad: 5,
    });
    expect(bounds).not.toBeNull();
    if (!bounds) return;
    const world = worldFromBounds(bounds);
    expect(bounds.minX + world.offsetX).toBe(SAFE_MARGIN);
    expect(bounds.minY + world.offsetY).toBe(SAFE_MARGIN);
    expect(bounds.maxX + world.offsetX + SAFE_MARGIN).toBeLessThanOrEqual(world.width);
    expect(bounds.maxY + world.offsetY + SAFE_MARGIN).toBeLessThanOrEqual(world.height);
    expect(-500 + world.offsetX).toBeGreaterThanOrEqual(SAFE_MARGIN);
    expect(-200 + world.offsetY).toBeGreaterThanOrEqual(SAFE_MARGIN);
  });

  it("keeps content at positive coordinates tight too", () => {
    const bounds = computeContentBounds({ rects: [{ x: 120, y: 80, w: 300, h: 200 }] });
    if (!bounds) throw new Error("no bounds");
    const canvas = canvasFromBounds(bounds);
    expect(canvas.width).toBe(300 + SAFE_MARGIN * 2);
    expect(canvas.height).toBe(200 + SAFE_MARGIN * 2);
    expect(canvas.fitWidth).toBe(canvas.width);
    expect(canvas.offsetX).toBe(SAFE_MARGIN - 120);
  });
});

describe("clampRectInto", () => {
  const bounds = { minX: -50, minY: 10, maxX: 400, maxY: 200 };
  it("moves a rect that sticks out on any side back inside", () => {
    for (const rect of [
      { x: -90, y: 5, w: 100, h: 22 },
      { x: 380, y: 190, w: 100, h: 22 },
      { x: 100, y: 100, w: 100, h: 22 },
    ]) {
      expect(rectInside(clampRectInto(rect, bounds), bounds)).toBe(true);
    }
    expect(clampRectInto({ x: 100, y: 100, w: 100, h: 22 }, bounds)).toEqual({ x: 100, y: 100, w: 100, h: 22 });
  });
});

describe("computeFit", () => {
  it("fits and centres the content box in the viewport", () => {
    const fit = computeFit({ width: 1000, height: 600 }, { width: 500, height: 300, fitWidth: 500, fitHeight: 300 });
    expect(fit.zoom).toBeCloseTo(1.15);
    expect(fit.pan.x).toBeCloseTo((1000 - 500 * 1.15) / 2);
    expect(fit.pan.y).toBeCloseTo((600 - 300 * 1.15) / 2);
  });
  it("shrinks big content to fit and honours fitLeft/fitTop", () => {
    const fit = computeFit(
      { width: 800, height: 500 },
      { width: 2000, height: 1000, fitLeft: 100, fitTop: 50, fitWidth: 1600, fitHeight: 800 },
    );
    expect(fit.zoom).toBeCloseTo(784 / 1600);
    expect(fit.pan.x).toBeCloseTo((800 - 1600 * fit.zoom) / 2 - 100 * fit.zoom);
    expect(fit.pan.y).toBeCloseTo((500 - 800 * fit.zoom) / 2 - 50 * fit.zoom);
  });
});
