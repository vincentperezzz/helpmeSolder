import { STUB_SPREAD } from "./constants";
import {
  pathCrossesObstacles,
  pathLength,
  pathWireOverlap,
  pointInRect,
  segmentHitsRect,
  segmentsOverlap,
  stubLength,
  stubPoint,
} from "./geometry";
import type { ExitDir, Point, Rect } from "./types";

/**
 * Body rectangle of a placed part. `hug` marks solid bodies (boards, modules,
 * loose parts): wires may not cross them, and a wire attached to one of their
 * pins leaves the body before it turns. `soft` marks parts that sit on a
 * breadboard: wires may pass them. Rects with neither flag (breadboards, power
 * sources) are crossed only by wires that are attached to them.
 */
export type Obstacle = Rect & { hug?: boolean; soft?: boolean };

const EDGE_GAP = 8;
const BEND_PENALTY = 40;
const OVERLAP_PENALTY = 60;
const GRID_GAPS = [EDGE_GAP, EDGE_GAP + 8];

const ALL_DIRS: ExitDir[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

function edgeDistance(pin: Point, dir: ExitDir, rect: Rect): number {
  const d =
    dir.dx > 0
      ? rect.x + rect.w - pin.x
      : dir.dx < 0
        ? pin.x - rect.x
        : dir.dy > 0
          ? rect.y + rect.h - pin.y
          : pin.y - rect.y;
  return Math.max(0, d);
}

/** Smallest solid (hug) obstacle that contains the pin, if any. */
function ownerOf(pin: Point, obstacles: Obstacle[]): Obstacle | undefined {
  let owner: Obstacle | undefined;
  for (const obs of obstacles) {
    if (!obs.hug || !pointInRect(pin, obs, 1)) continue;
    if (!owner || obs.w * obs.h < owner.w * owner.h) owner = obs;
  }
  return owner;
}

/**
 * Where a wire leaves its own part: along the pin's exit direction, past the
 * edge of the part's body so the wire never runs over it. If the pin sits much
 * closer to another edge (a pin on the bottom edge of a part whose exit
 * direction says "sideways"), it leaves through that edge instead.
 */
export function escapeStub(
  pin: Point,
  dir: ExitDir,
  owner: Rect,
  slot: number,
): { stub: Point; dir: ExitDir } {
  let outDir = dir;
  const dirDist = edgeDistance(pin, dir, owner);
  if (dirDist > 24) {
    let best = dirDist;
    for (const candidate of ALL_DIRS) {
      const dist = edgeDistance(pin, candidate, owner);
      if (dist < best) {
        best = dist;
        outDir = candidate;
      }
    }
    if (best >= dirDist / 2) outDir = dir;
  }
  const len = edgeDistance(pin, outDir, owner) + EDGE_GAP + (slot % 3) * STUB_SPREAD;
  return { stub: stubPoint(pin, outDir, len), dir: outDir };
}

/** Does any leg of the path pass through the interior of a rectangle? */
export function pathHitsRects(points: Point[], rects: Rect[]): boolean {
  for (let i = 0; i < points.length - 1; i += 1) {
    for (const rect of rects) {
      if (segmentHitsRect(points[i], points[i + 1], rect)) return true;
    }
  }
  return false;
}

function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i > 0; i -= 1) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) {
      out.splice(i, 1);
    }
  }
  return out;
}

/**
 * Orthogonal shortest route from `a` to `b` that never enters the interior of
 * `solid`. Searches the grid formed by the endpoints and the lines just outside
 * each obstacle. Fewer bends and fewer overlaps with earlier wires win.
 * Deterministic. Returns null when no route exists.
 */
export function gridRoute(
  a: Point,
  b: Point,
  solid: Rect[],
  mids: Point,
  prior: Point[][],
): Point[] | null {
  const xSet = new Set<number>([a.x, b.x, mids.x]);
  const ySet = new Set<number>([a.y, b.y, mids.y]);
  for (const obs of solid) {
    for (const gap of GRID_GAPS) {
      xSet.add(obs.x - gap);
      xSet.add(obs.x + obs.w + gap);
      ySet.add(obs.y - gap);
      ySet.add(obs.y + obs.h + gap);
    }
  }
  const xs = [...xSet].sort((p, q) => p - q);
  const ys = [...ySet].sort((p, q) => p - q);
  const ai = xs.indexOf(a.x);
  const aj = ys.indexOf(a.y);
  const bi = xs.indexOf(b.x);
  const bj = ys.indexOf(b.y);

  const moves = [
    { di: 1, dj: 0 },
    { di: -1, dj: 0 },
    { di: 0, dj: 1 },
    { di: 0, dj: -1 },
  ];
  const stateOf = (i: number, j: number, m: number) => (j * xs.length + i) * 4 + m;
  const dist = new Float64Array(xs.length * ys.length * 4).fill(
    Number.POSITIVE_INFINITY,
  );
  const prev = new Int32Array(xs.length * ys.length * 4).fill(-1);

  type Entry = { cost: number; seq: number; i: number; j: number; m: number };
  const heap: Entry[] = [];
  const less = (p: Entry, q: Entry) =>
    p.cost < q.cost || (p.cost === q.cost && p.seq < q.seq);
  let seq = 0;
  const push = (entry: Entry) => {
    heap.push(entry);
    let k = heap.length - 1;
    while (k > 0) {
      const parent = (k - 1) >> 1;
      if (!less(heap[k], heap[parent])) break;
      [heap[k], heap[parent]] = [heap[parent], heap[k]];
      k = parent;
    }
  };
  const pop = (): Entry => {
    const top = heap[0];
    const last = heap.pop() as Entry;
    if (heap.length > 0) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let s = k;
        if (l < heap.length && less(heap[l], heap[s])) s = l;
        if (r < heap.length && less(heap[r], heap[s])) s = r;
        if (s === k) break;
        [heap[k], heap[s]] = [heap[s], heap[k]];
        k = s;
      }
    }
    return top;
  };

  for (let m = 0; m < 4; m += 1) {
    dist[stateOf(ai, aj, m)] = 0;
    push({ cost: 0, seq: seq++, i: ai, j: aj, m });
  }

  let goal = -1;
  while (heap.length > 0) {
    const cur = pop();
    const cs = stateOf(cur.i, cur.j, cur.m);
    if (cur.cost > dist[cs]) continue;
    if (cur.i === bi && cur.j === bj) {
      goal = cs;
      break;
    }
    for (let m = 0; m < 4; m += 1) {
      const ni = cur.i + moves[m].di;
      const nj = cur.j + moves[m].dj;
      if (ni < 0 || nj < 0 || ni >= xs.length || nj >= ys.length) continue;
      const p = { x: xs[cur.i], y: ys[cur.j] };
      const q = { x: xs[ni], y: ys[nj] };
      if (solid.some((rect) => segmentHitsRect(p, q, rect))) continue;
      let step = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
      if (cur.cost > 0 && m !== cur.m) step += BEND_PENALTY;
      const overlaps = prior.some((path) =>
        path.some((pt, k) => k > 0 && segmentsOverlap(p, q, path[k - 1], pt)),
      );
      if (overlaps) step += OVERLAP_PENALTY;
      const next = cur.cost + step;
      const ns = stateOf(ni, nj, m);
      if (next < dist[ns]) {
        dist[ns] = next;
        prev[ns] = cs;
        push({ cost: next, seq: seq++, i: ni, j: nj, m });
      }
    }
  }
  if (goal < 0) return null;

  const route: Point[] = [];
  for (let s = goal; s >= 0; s = prev[s]) {
    const node = Math.floor(s / 4);
    route.push({ x: xs[node % xs.length], y: ys[Math.floor(node / xs.length)] });
  }
  return simplify(route.reverse());
}

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
  fromDirIn: ExitDir,
  toDirIn: ExitDir,
  obstacles: Obstacle[],
  index: number,
  priorPaths: Point[][],
): { d: string; mid: Point; points: Point[] } {
  const lane = ((index % 7) - 3) * 14;

  let fromStub = stubPoint(from, fromDirIn, stubLength(index));
  let toStub = stubPoint(to, toDirIn, stubLength(index + 2));
  const fromOwner = ownerOf(from, obstacles);
  const toOwner = ownerOf(to, obstacles);
  if (fromOwner) fromStub = escapeStub(from, fromDirIn, fromOwner, index).stub;
  if (toOwner) toStub = escapeStub(to, toDirIn, toOwner, index + 2).stub;

  // Bodies this wire must not cross: every solid part, plus breadboards and
  // power sources it is not attached to. Soft parts never block.
  const solid = obstacles.filter(
    (obs) =>
      !obs.soft &&
      (obs.hug || (!pointInRect(from, obs, 2) && !pointInRect(to, obs, 2))),
  );

  const blockers = blockersForWire(fromStub, toStub, solid);
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

  // Safety net: the candidates above are fixed shapes. If even the best one
  // still crosses a body, search for a route that goes around instead.
  if (pathHitsRects(best.slice(1, -1), solid)) {
    const mids = {
      x: (fromStub.x + toStub.x) / 2 + lane,
      y: (fromStub.y + toStub.y) / 2 + lane * 0.55,
    };
    const grid = gridRoute(fromStub, toStub, solid, mids, priorPaths);
    if (grid) best = simplify([from, ...grid, to]);
  }

  const d = best
    .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ");
  const mid = best[Math.floor(best.length / 2)];
  return { d, mid, points: best };
}
