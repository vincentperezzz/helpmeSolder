import { describe, expect, it } from "vitest";
import { pathHitsRects, routedPath, type Obstacle } from "./routing";
import type { Point } from "./types";

// ESP32 DevKit at (120,120) and a buzzer on its right, as laid out on a guide.
const board: Obstacle = { x: 110, y: 110, w: 127.3, h: 224, hug: true };
const buzzer: Obstacle = { x: 690, y: 110, w: 84, h: 110, hug: true };
const L = { dx: -1, dy: 0 };
const R = { dx: 1, dy: 0 };

function interiorHits(points: Point[], rect: Obstacle) {
  return pathHitsRects(points, [rect]);
}

describe("routedPath", () => {
  it("never crosses the body between points on opposite sides of a rectangle", () => {
    const rect: Obstacle = { x: 300, y: 100, w: 200, h: 200, hug: true };
    const from = { x: 200, y: 200 };
    const to = { x: 600, y: 200 };
    const route = routedPath(from, to, R, L, [rect], 0, []);
    expect(interiorHits(route.points, rect)).toBe(false);
    expect(route.points[0]).toEqual(from);
    expect(route.points[route.points.length - 1]).toEqual(to);
  });

  it("routes buzzer wires around the ESP32 body into the header pins", () => {
    const prior: Point[][] = [];
    const wires = [
      { from: { x: 727, y: 204 }, fromDir: L, to: { x: 125, y: 259.5 }, toDir: L },
      { from: { x: 737, y: 204 }, fromDir: R, to: { x: 221.3, y: 269 }, toDir: R },
    ];
    wires.forEach((w, i) => {
      const route = routedPath(w.from, w.to, w.fromDir, w.toDir, [board, buzzer], i, prior);
      prior.push(route.points);
      expect(interiorHits(route.points.slice(1, -1), board)).toBe(false);
      expect(interiorHits(route.points.slice(1, -1), buzzer)).toBe(false);
      for (let k = 1; k < route.points.length; k += 1) {
        const a = route.points[k - 1];
        const b = route.points[k];
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
    });
  });

  it("is deterministic", () => {
    const args = [
      { x: 727, y: 204 },
      { x: 125, y: 259.5 },
      L,
      L,
      [board, buzzer],
      3,
      [],
    ] as const;
    const a = routedPath(...(args as unknown as Parameters<typeof routedPath>));
    const b = routedPath(...(args as unknown as Parameters<typeof routedPath>));
    expect(a.d).toBe(b.d);
  });
});
