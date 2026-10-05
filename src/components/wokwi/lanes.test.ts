import { describe, expect, it } from "vitest";
import {
  LANE_GAP,
  assignLanes,
  collinearOverlap,
  findCollinearOverlaps,
  findCrossings,
  hopPoints,
  roundedPath,
  segmentCrossing,
} from "./lanes";
import type { Point } from "./types";

const P = (x: number, y: number): Point => ({ x, y });

describe("collinearOverlap", () => {
  it("detects legs on the same line that share length", () => {
    expect(collinearOverlap(P(0, 100), P(200, 100), P(100, 100), P(300, 100))?.overlap).toBe(100);
    expect(collinearOverlap(P(50, 0), P(50, 200), P(50, 150), P(50, 400))?.axis).toBe("v");
  });
  it("counts near-parallel legs closer than the lane gap", () => {
    expect(collinearOverlap(P(0, 100), P(200, 100), P(0, 104), P(200, 104))).not.toBeNull();
    expect(collinearOverlap(P(0, 100), P(200, 100), P(0, 100 + LANE_GAP), P(200, 100 + LANE_GAP))).toBeNull();
  });
  it("ignores legs that only touch, run apart, or go different ways", () => {
    expect(collinearOverlap(P(0, 100), P(100, 100), P(100, 100), P(200, 100))).toBeNull();
    expect(collinearOverlap(P(0, 100), P(100, 100), P(0, 160), P(100, 160))).toBeNull();
    expect(collinearOverlap(P(0, 100), P(100, 100), P(50, 0), P(50, 200))).toBeNull();
  });
  it("lists overlapping pairs across wires in a stable order", () => {
    const paths = [
      [P(0, 0), P(0, 100), P(300, 100), P(300, 200)],
      [P(40, 0), P(40, 100), P(250, 100), P(250, 300)],
    ];
    const hits = findCollinearOverlaps(paths);
    expect(hits.map((h) => [h.a, h.b, h.segA, h.segB])).toEqual([[0, 1, 1, 1]]);
  });
});

describe("assignLanes", () => {
  // Wires that all run along y = 200 between x = 100 and x = 500.
  const make = (pinY: number, endY: number): Point[] => [
    P(60, pinY),
    P(100, pinY),
    P(100, 200),
    P(500, 200),
    P(500, endY),
    P(540, endY),
  ];

  it("puts wires sharing a line on separate lanes at least 8px apart", () => {
    const paths = [make(40, 400), make(60, 420), make(80, 440)];
    expect(findCollinearOverlaps(paths).length).toBeGreaterThan(0);
    const lanes = assignLanes(paths);
    expect(findCollinearOverlaps(lanes)).toEqual([]);
    const ys = lanes.map((path) => path[3].y);
    expect(new Set(ys).size).toBe(3);
    const sorted = [...ys].sort((a, b) => a - b);
    expect(sorted[1] - sorted[0]).toBeGreaterThanOrEqual(LANE_GAP);
    expect(sorted[2] - sorted[1]).toBeGreaterThanOrEqual(LANE_GAP);
  });

  it("keeps the first wire where it was and shifts later wires, in order", () => {
    const lanes = assignLanes([make(40, 400), make(60, 420)]);
    expect(lanes[0][3].y).toBe(200);
    expect(lanes[1][3].y).not.toBe(200);
  });

  it("stays orthogonal and keeps pins and pin-end legs in place", () => {
    const paths = [make(40, 400), make(60, 420)];
    const lanes = assignLanes(paths);
    lanes.forEach((path, i) => {
      expect(path[0]).toEqual(paths[i][0]);
      expect(path[path.length - 1]).toEqual(paths[i][paths[i].length - 1]);
      for (let k = 1; k < path.length; k += 1) {
        expect(path[k].x === path[k - 1].x || path[k].y === path[k - 1].y).toBe(true);
      }
      // First and last legs keep their line.
      expect(path[1].y).toBe(paths[i][1].y);
      expect(path[path.length - 2].y).toBe(paths[i][path.length - 2].y);
    });
  });

  it("moves legs away from a solid box instead of into it", () => {
    const wall = { x: 0, y: 190, w: 1000, h: 6 };
    const lanes = assignLanes([make(40, 400), make(60, 420)], { solid: [[wall], [wall]] });
    expect(lanes[1][3].y).toBeGreaterThanOrEqual(wall.y + wall.h);
  });

  it("is deterministic and leaves wires that already have room alone", () => {
    const apart = [
      [P(0, 0), P(0, 50), P(300, 50), P(300, 100)],
      [P(20, 0), P(20, 150), P(320, 150), P(320, 200)],
    ];
    expect(assignLanes(apart)).toEqual(apart);
    const paths = [make(40, 400), make(60, 420), make(80, 440)];
    expect(assignLanes(paths)).toEqual(assignLanes(paths));
  });
});

describe("crossings and hops", () => {
  it("finds a perpendicular crossing in the middle of both legs", () => {
    expect(segmentCrossing(P(0, 50), P(100, 50), P(40, 0), P(40, 100))).toEqual(P(40, 50));
    expect(segmentCrossing(P(40, 0), P(40, 100), P(0, 50), P(100, 50))).toEqual(P(40, 50));
  });
  it("ignores parallel legs and touches at an end or a corner", () => {
    expect(segmentCrossing(P(0, 50), P(100, 50), P(0, 60), P(100, 60))).toBeNull();
    expect(segmentCrossing(P(0, 50), P(100, 50), P(100, 0), P(100, 100))).toBeNull();
    expect(segmentCrossing(P(0, 50), P(100, 50), P(40, 50), P(40, 100))).toBeNull();
  });
  it("lets the horizontal wire hop over the vertical one", () => {
    const paths = [
      [P(0, 50), P(100, 50), P(100, 90)],
      [P(40, 0), P(40, 100), P(60, 100)],
    ];
    const crossings = findCrossings(paths);
    expect(crossings).toHaveLength(1);
    expect(crossings[0].hopper).toBe(0);
    expect(hopPoints(paths)).toEqual([[P(40, 50)], []]);
    expect(hopPoints(paths, [true, false])).toEqual([[], []]);
  });
});

describe("roundedPath", () => {
  const route = [P(0, 0), P(100, 0), P(100, 80), P(220, 80)];
  it("rounds each corner with a small curve and ends on the pins", () => {
    const d = roundedPath(route);
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d.endsWith("L 220 80")).toBe(true);
    expect(d.match(/Q/g)).toHaveLength(2);
    expect(d).toContain("Q 100 0 100 6");
  });
  it("draws a hop arc where a horizontal leg crosses another wire", () => {
    const d = roundedPath(route, [P(50, 0)]);
    expect(d).toContain("A 5 5 0 0 1 55 0");
    expect(roundedPath(route, [P(50, 0)])).toBe(d);
  });
  it("leaves out hops that are too close to a corner", () => {
    expect(roundedPath(route, [P(97, 0)])).not.toContain("A ");
  });
  it("copes with short legs by shrinking the corner radius", () => {
    const d = roundedPath([P(0, 0), P(4, 0), P(4, 4), P(30, 4)]);
    expect(d).toContain("Q 4 0 4 2");
  });
});
