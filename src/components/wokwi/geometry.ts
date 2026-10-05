import { parseBreadboardRail } from "./breadboard";
import { BB_ROW_Y, STUB_BASE, STUB_SPREAD } from "./constants";
import type { ExitDir, Point, Rect } from "./types";

export function pointInRect(point: Point, rect: Rect, pad = 0): boolean {
  return (
    point.x >= rect.x - pad &&
    point.x <= rect.x + rect.w + pad &&
    point.y >= rect.y - pad &&
    point.y <= rect.y + rect.h + pad
  );
}

export function segmentHitsRect(a: Point, b: Point, rect: Rect): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  if (a.y === b.y) {
    if (a.y <= rect.y || a.y >= rect.y + rect.h) return false;
    return maxX > rect.x && minX < rect.x + rect.w;
  }
  if (a.x === b.x) {
    if (a.x <= rect.x || a.x >= rect.x + rect.w) return false;
    return maxY > rect.y && minY < rect.y + rect.h;
  }
  return false;
}

export function segmentDeepHit(a: Point, b: Point, obstacle: Rect): boolean {
  if (!segmentHitsRect(a, b, obstacle)) return false;
  const aInside = pointInRect(a, obstacle, 4);
  const bInside = pointInRect(b, obstacle, 4);
  if (aInside && bInside) return true;
  if (!aInside && !bInside) return true;
  const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const maxStub = Math.min(obstacle.w, obstacle.h) * 0.35 + 20;
  return len > maxStub;
}

export function pathCrossesObstacles(points: Point[], obstacles: Rect[]): boolean {
  for (let i = 1; i < points.length - 1; i += 1) {
    for (const obstacle of obstacles) {
      if (pointInRect(points[i], obstacle, -4)) return true;
    }
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    for (const obstacle of obstacles) {
      if (segmentDeepHit(points[i], points[i + 1], obstacle)) return true;
    }
  }
  return false;
}

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total +=
      Math.abs(points[i + 1].x - points[i].x) +
      Math.abs(points[i + 1].y - points[i].y);
  }
  return total;
}

export function stubLength(index: number): number {
  return STUB_BASE + (index % 3) * STUB_SPREAD;
}

export function stubPoint(pin: Point, dir: ExitDir, len: number): Point {
  return { x: pin.x + dir.dx * len, y: pin.y + dir.dy * len };
}

export function pinExitDirection(pinLocal: Point, allPinsLocal: Point[]): ExitDir {
  const minX = Math.min(...allPinsLocal.map((p) => p.x));
  const maxX = Math.max(...allPinsLocal.map((p) => p.x));
  const minY = Math.min(...allPinsLocal.map((p) => p.y));
  const maxY = Math.max(...allPinsLocal.map((p) => p.y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const tol = 7;

  const atTop = pinLocal.y <= minY + tol;
  const atBottom = pinLocal.y >= maxY - tol;
  const atLeft = pinLocal.x <= minX + tol;
  const atRight = pinLocal.x >= maxX - tol;

  if (spanX >= spanY * 0.85) {
    if (atTop && !atBottom) return { dx: 0, dy: -1 };
    if (atBottom && !atTop) return { dx: 0, dy: 1 };
  }
  if (spanY >= spanX * 0.85) {
    if (atLeft && !atRight) return { dx: -1, dy: 0 };
    if (atRight && !atLeft) return { dx: 1, dy: 0 };
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const vx = pinLocal.x - cx;
  const vy = pinLocal.y - cy;
  if (Math.abs(vx) >= Math.abs(vy)) {
    return { dx: vx >= 0 ? 1 : -1, dy: 0 };
  }
  return { dx: 0, dy: vy >= 0 ? 1 : -1 };
}

export function breadboardPinExit(pinId: string): ExitDir {
  const rail = parseBreadboardRail(pinId);
  if (rail) {
    return rail.side === "t" ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 };
  }
  const match = /^([a-j])/i.exec(pinId);
  if (!match) return { dx: 0, dy: -1 };
  const row = match[1].toLowerCase();
  return row <= "e" ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 };
}

export function exitFromBodyCenter(pin: Point, center: Point): ExitDir {
  const vx = pin.x - center.x;
  const vy = pin.y - center.y;
  if (Math.abs(vx) >= Math.abs(vy)) {
    return { dx: vx >= 0 ? 1 : -1, dy: 0 };
  }
  return { dx: 0, dy: vy >= 0 ? 1 : -1 };
}

export function segmentsOverlap(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
  tol = 6,
): boolean {
  if (Math.abs(a1.y - a2.y) < 0.5 && Math.abs(b1.y - b2.y) < 0.5) {
    if (Math.abs(a1.y - b1.y) > tol) return false;
    const aMin = Math.min(a1.x, a2.x);
    const aMax = Math.max(a1.x, a2.x);
    const bMin = Math.min(b1.x, b2.x);
    const bMax = Math.max(b1.x, b2.x);
    return aMax > bMin + tol && bMax > aMin + tol;
  }
  if (Math.abs(a1.x - a2.x) < 0.5 && Math.abs(b1.x - b2.x) < 0.5) {
    if (Math.abs(a1.x - b1.x) > tol) return false;
    const aMin = Math.min(a1.y, a2.y);
    const aMax = Math.max(a1.y, a2.y);
    const bMin = Math.min(b1.y, b2.y);
    const bMax = Math.max(b1.y, b2.y);
    return aMax > bMin + tol && bMax > aMin + tol;
  }
  return false;
}

export function pathWireOverlap(points: Point[], prior: Point[][]): number {
  let overlap = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    for (const path of prior) {
      for (let j = 0; j < path.length - 1; j += 1) {
        if (segmentsOverlap(points[i], points[i + 1], path[j], path[j + 1])) {
          overlap += 1;
        }
      }
    }
  }
  return overlap;
}

/**
 * Short jumper between two holes or rails of the same breadboard: straight
 * when they share a column, otherwise up (or down) to a lane, across, and in.
 */
export function breadboardJumperPoints(from: Point, to: Point): Point[] {
  if (Math.abs(from.x - to.x) < 0.5) return [from, to];
  const topHalf = (from.y + to.y) / 2 < (BB_ROW_Y.e + BB_ROW_Y.f) / 2;
  const lane = topHalf ? Math.min(from.y, to.y) - 8 : Math.max(from.y, to.y) + 8;
  return [from, { x: from.x, y: lane }, { x: to.x, y: lane }, to];
}
