import { describe, expect, it } from "vitest";
import {
  SIGNAL_WIRE_PALETTE,
  assignWireColors,
  labelLeader,
  nearestPointOnPath,
  wireColorName,
  labelRect,
  pointAlongPath,
  resolveLabelPositions,
  segmentIntersectsRect,
} from "./labels";
import type { Point, Rect, Wire } from "./types";

function wire(id: string, label: string, points: Point[]): Wire {
  const mid = points[Math.floor(points.length / 2)];
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

function boxOf(w: Wire): Rect {
  return labelRect(w.mid, w.label);
}

describe("segmentIntersectsRect", () => {
  const rect = { x: 10, y: 10, w: 20, h: 20 };
  it("detects crossings, touches and misses", () => {
    expect(segmentIntersectsRect({ x: 0, y: 20 }, { x: 40, y: 20 }, rect)).toBe(true);
    expect(segmentIntersectsRect({ x: 20, y: 0 }, { x: 20, y: 9 }, rect)).toBe(false);
    expect(segmentIntersectsRect({ x: 15, y: 15 }, { x: 18, y: 18 }, rect)).toBe(true);
    expect(segmentIntersectsRect({ x: 0, y: 40 }, { x: 40, y: 40 }, rect)).toBe(false);
  });
});

describe("pointAlongPath", () => {
  it("walks around corners and clamps at the end", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
    ];
    expect(pointAlongPath(pts, 130)).toEqual({ x: 100, y: 30 });
    expect(pointAlongPath(pts, 999)).toEqual({ x: 100, y: 50 });
  });
});

describe("resolveLabelPositions", () => {
  it("slides a label off another wire that crosses its default spot", () => {
    const a = wire("a", "A to B", [
      { x: 100, y: 200 },
      { x: 500, y: 200 },
    ]);
    // A vertical wire runs straight through the middle of wire a.
    const b = wire("b", "C to D", [
      { x: 300, y: 100 },
      { x: 300, y: 300 },
    ]);
    b.showLabel = false;
    resolveLabelPositions([a, b], []);
    expect(a.showLabel).toBe(true);
    const box = boxOf(a);
    expect(segmentIntersectsRect(b.points[0], b.points[1], box)).toBe(false);
    // Still on its own wire, not floating somewhere else.
    expect(Math.abs(a.mid.y - 200)).toBeLessThanOrEqual(40);
  });

  it("keeps labels off each other, off parts, and off a wire's own other legs", () => {
    const wires = [
      wire("w1", "first label here", [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 300 },
        { x: 600, y: 300 },
      ]),
      wire("w2", "second label here", [
        { x: 100, y: 120 },
        { x: 220, y: 120 },
        { x: 220, y: 320 },
        { x: 600, y: 320 },
      ]),
    ];
    const part: Rect = { x: 300, y: 200, w: 120, h: 60 };
    resolveLabelPositions(wires, [part]);
    const [b1, b2] = wires.map(boxOf);
    expect(wires.every((w) => w.showLabel)).toBe(true);
    expect(b1.x < b2.x + b2.w && b2.x < b1.x + b1.w && b1.y < b2.y + b2.h && b2.y < b1.y + b1.h).toBe(false);
    for (const [w, box] of [[wires[0], b1], [wires[1], b2]] as const) {
      const other = wires.find((x) => x !== w) as Wire;
      for (let i = 0; i < other.points.length - 1; i += 1) {
        expect(segmentIntersectsRect(other.points[i], other.points[i + 1], box)).toBe(false);
      }
      expect(box.x < part.x + part.w && part.x < box.x + box.w && box.y < part.y + part.h && part.y < box.y + box.h).toBe(false);
    }
  });

  it("is deterministic", () => {
    const make = () => [
      wire("a", "alpha", [
        { x: 100, y: 200 },
        { x: 500, y: 200 },
      ]),
      wire("b", "beta", [
        { x: 300, y: 100 },
        { x: 300, y: 300 },
      ]),
    ];
    const one = make();
    const two = make();
    resolveLabelPositions(one, []);
    resolveLabelPositions(two, []);
    expect(one.map((w) => w.mid)).toEqual(two.map((w) => w.mid));
  });
});

describe("assignWireColors", () => {
  it("makes power red, ground black and signals distinct, non-red, non-black", () => {
    const colors = assignWireColors(["VIN to 5V", "GND to GND", "D13 to SIG", "D12 to SIG", "SDA to SDA"]);
    expect(colors[0]).toBe("#c62828");
    expect(colors[1]).toBe("#212121");
    const signals = colors.slice(2);
    expect(new Set(signals).size).toBe(signals.length);
    for (const c of signals) expect(["#c62828", "#212121"]).not.toContain(c);
  });
  it("stays unique across every palette entry, then reuses colours, never red or black", () => {
    const labels = Array.from({ length: SIGNAL_WIRE_PALETTE.length + 3 }, (_, i) => `P${i} to X${i}`);
    const colors = assignWireColors(labels);
    expect(new Set(colors.slice(0, SIGNAL_WIRE_PALETTE.length)).size).toBe(SIGNAL_WIRE_PALETTE.length);
    expect(colors.every((c) => c !== "#c62828" && c !== "#212121")).toBe(true);
  });
  it("names every palette colour", () => {
    for (const c of SIGNAL_WIRE_PALETTE) expect(wireColorName(c)).not.toBe("coloured");
  });
});

describe("labelLeader", () => {
  const line = [
    { x: 0, y: 100 },
    { x: 400, y: 100 },
  ];
  it("finds the nearest point on the wire", () => {
    expect(nearestPointOnPath(line, { x: 50, y: 160 })).toEqual({ point: { x: 50, y: 100 }, dist: 60 });
  });
  it("needs no leader when the pill sits on its wire", () => {
    expect(labelLeader(line, { x: 200, y: 100 }, "+ to VIN")).toBeNull();
  });
  it("draws a short tick from the pill edge to the wire when the pill is beside it", () => {
    const leader = labelLeader(line, { x: 200, y: 140 }, "+ to VIN");
    expect(leader?.to).toEqual({ x: 200, y: 100 });
    expect(leader?.from.y).toBeCloseTo(140 - 11);
  });
});
