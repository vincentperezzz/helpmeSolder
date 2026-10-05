import {
  pathCrossesObstacles,
  pathLength,
  pathWireOverlap,
  pointInRect,
  stubLength,
  stubPoint,
} from "./geometry";
import type { ExitDir, Point, Rect } from "./types";

export function inflateObstacles(obstacles: Rect[], inset = 10): Rect[] {
  return obstacles.map((obs) => ({
    x: obs.x + inset,
    y: obs.y + inset,
    w: Math.max(8, obs.w - inset * 2),
    h: Math.max(8, obs.h - inset * 2),
  }));
}

export function blockersForWire(from: Point, to: Point, obstacles: Rect[]): Rect[] {
  return obstacles.filter((obs) => {
    const fromInside = pointInRect(from, obs, 6);
    const toInside = pointInRect(to, obs, 6);
    if (fromInside && toInside) return false;

    const left = Math.min(from.x, to.x);
    const right = Math.max(from.x, to.x);
    const spansX = right > obs.x + 12 && left < obs.x + obs.w - 12;
    if (!spansX) return false;

    const fromLeft = from.x < obs.x + obs.w * 0.3;
    const fromRight = from.x > obs.x + obs.w * 0.7;
    const toLeft = to.x < obs.x + obs.w * 0.3;
    const toRight = to.x > obs.x + obs.w * 0.7;
    const spansAcross = (fromLeft && toRight) || (fromRight && toLeft);

    if (!fromInside && !toInside) {
      const top = Math.min(from.y, to.y);
      const bottom = Math.max(from.y, to.y);
      const overlapsY = bottom > obs.y && top < obs.y + obs.h;
      return spansAcross || overlapsY;
    }

    const outside = fromInside ? to : from;
    const exitsFarSide =
      outside.x < obs.x - 8 || outside.x > obs.x + obs.w + 8;
    return exitsFarSide || spansAcross;
  });
}

export function routedPath(
  from: Point,
  to: Point,
  fromDir: ExitDir,
  toDir: ExitDir,
  obstacles: Rect[],
  index: number,
  priorPaths: Point[][],
): { d: string; mid: Point; points: Point[] } {
  const lane = ((index % 7) - 3) * 14;
  const fromStubLen = stubLength(index);
  const toStubLen = stubLength(index + 2);
  const fromStub = stubPoint(from, fromDir, fromStubLen);
  const toStub = stubPoint(to, toDir, toStubLen);

  const blockers = blockersForWire(fromStub, toStub, obstacles);
  const avoid = inflateObstacles(obstacles, 8);

  const routeCore = (a: Point, b: Point): Point[][] => {
    const cores: Point[][] = [];
    const midX = (a.x + b.x) / 2 + lane;
    cores.push([a, { x: midX, y: a.y }, { x: midX, y: b.y }, b]);
    const midY = (a.y + b.y) / 2 + lane * 0.55;
    cores.push([a, { x: a.x, y: midY }, { x: b.x, y: midY }, b]);
    cores.push([a, { x: b.x, y: a.y }, b]);
    cores.push([a, { x: a.x, y: b.y }, b]);

    if (blockers.length > 0) {
      const clearTop =
        Math.min(...blockers.map((obs) => obs.y)) - 40 - Math.abs(lane);
      const clearBot =
        Math.max(...blockers.map((obs) => obs.y + obs.h)) + 40 + Math.abs(lane);
      const clearRight =
        Math.max(...blockers.map((obs) => obs.x + obs.w)) + 36 + Math.abs(lane);
      const clearLeft =
        Math.min(...blockers.map((obs) => obs.x)) - 36 - Math.abs(lane);

      cores.push([a, { x: a.x, y: clearTop }, { x: b.x, y: clearTop }, b]);
      cores.push([a, { x: a.x, y: clearBot }, { x: b.x, y: clearBot }, b]);
      cores.push([
        a,
        { x: a.x, y: clearTop },
        { x: clearRight, y: clearTop },
        { x: clearRight, y: b.y },
        b,
      ]);
      cores.push([
        a,
        { x: a.x, y: clearBot },
        { x: clearRight, y: clearBot },
        { x: clearRight, y: b.y },
        b,
      ]);
      cores.push([
        a,
        { x: clearLeft, y: a.y },
        { x: clearLeft, y: clearTop },
        { x: b.x, y: clearTop },
        b,
      ]);
      cores.push([
        a,
        { x: clearLeft, y: a.y },
        { x: clearLeft, y: clearBot },
        { x: b.x, y: clearBot },
        b,
      ]);
      cores.push([a, { x: clearRight, y: a.y }, { x: clearRight, y: b.y }, b]);
      cores.push([a, { x: clearLeft, y: a.y }, { x: clearLeft, y: b.y }, b]);
    }
    return cores;
  };

  const candidates: Point[][] = routeCore(fromStub, toStub).map((core) => [
    from,
    ...core,
    to,
  ]);

  let best = candidates[0] ?? [from, fromStub, toStub, to];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const hits = pathCrossesObstacles(candidate, avoid);
    const overlap = pathWireOverlap(candidate, priorPaths);
    const score =
      pathLength(candidate) +
      (hits ? 25000 : 0) +
      overlap * 900 +
      candidate.length * 6;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const d = best
    .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ");
  const mid = best[Math.floor(best.length / 2)];
  return { d, mid, points: best };
}
