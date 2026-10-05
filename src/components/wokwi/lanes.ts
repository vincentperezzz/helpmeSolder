import { segmentHitsRect } from "./geometry";
import type { Point, Rect } from "./types";

/** Parallel wires that share a stretch of the picture sit at least this many px apart. */
export const LANE_GAP = 8;
export const CORNER_RADIUS = 6;
export const HOP_RADIUS = 5;
/** Two wires must share more than this much length before they count as overlapping. */
const MIN_OVERLAP = 2;
/** A leg next to a shifted leg must stay at least this long (or not shrink if it was shorter). */
const MIN_ADJACENT = 4;
/** How far a leg may be moved from where the router put it, in lanes. */
const MAX_LANES = 6;
const EPS = 1e-6;

type Axis = "h" | "v";

/** "h" for a horizontal leg, "v" for a vertical one, null for a zero-length or diagonal leg. */
export function segmentAxis(a: Point, b: Point): Axis | null {
  const flatY = Math.abs(a.y - b.y) < 0.5;
  const flatX = Math.abs(a.x - b.x) < 0.5;
  if (flatY && !flatX) return "h";
  if (flatX && !flatY) return "v";
  return null;
}

function lineCoord(a: Point, b: Point, axis: Axis): number {
  return axis === "h" ? (a.y + b.y) / 2 : (a.x + b.x) / 2;
}

function range(a: Point, b: Point, axis: Axis): [number, number] {
  const p = axis === "h" ? [a.x, b.x] : [a.y, b.y];
  return [Math.min(p[0], p[1]), Math.max(p[0], p[1])];
}

export type CollinearOverlap = { axis: Axis; distance: number; overlap: number };

/**
 * Do two orthogonal legs run on top of each other? True when they run the same
 * way, are closer than `gap` px side by side and share more than `minOverlap`
 * px of length. Legs that merely touch at an end do not overlap.
 */
export function collinearOverlap(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
  gap = LANE_GAP,
  minOverlap = MIN_OVERLAP,
): CollinearOverlap | null {
  const axis = segmentAxis(a1, a2);
  if (!axis || axis !== segmentAxis(b1, b2)) return null;
  const distance = Math.abs(lineCoord(a1, a2, axis) - lineCoord(b1, b2, axis));
  if (distance >= gap - EPS) return null;
  const [aMin, aMax] = range(a1, a2, axis);
  const [bMin, bMax] = range(b1, b2, axis);
  const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
  if (overlap <= minOverlap) return null;
  return { axis, distance, overlap };
}

export type OverlapHit = { a: number; b: number; segA: number; segB: number } & CollinearOverlap;

/** Every pair of legs, from different wires, that overlap (see collinearOverlap). Deterministic order. */
export function findCollinearOverlaps(paths: Point[][], gap = LANE_GAP): OverlapHit[] {
  const hits: OverlapHit[] = [];
  for (let a = 0; a < paths.length; a += 1) {
    for (let b = a + 1; b < paths.length; b += 1) {
      for (let i = 0; i < paths[a].length - 1; i += 1) {
        for (let j = 0; j < paths[b].length - 1; j += 1) {
          const hit = collinearOverlap(paths[a][i], paths[a][i + 1], paths[b][j], paths[b][j + 1], gap);
          if (hit) hits.push({ a, b, segA: i, segB: j, ...hit });
        }
      }
    }
  }
  return hits;
}

export type LaneOptions = {
  gap?: number;
  /** Per path: boxes that a moved leg may not enter (index-aligned with `paths`). */
  solid?: Rect[][];
};

function isAnchored(pathLength: number, seg: number): boolean {
  // The leg leaving the first pin and the leg entering the last pin stay on their pins.
  return pathLength < 4 || seg === 0 || seg === pathLength - 2;
}

/**
 * Move overlapping inner legs onto separate lanes. Wires are handled in order:
 * a wire's inner leg that would run within `gap` px of an earlier wire's leg (or
 * of any wire's pin-end leg, which cannot move) shifts sideways to the nearest
 * free lane, never closer than `gap` px to another leg, never into a solid box
 * and never so far that a neighbouring leg collapses. Pin-end legs keep their
 * pins; their neighbours stretch. Pure and deterministic. Returns new paths.
 */
export function assignLanes(paths: Point[][], options: LaneOptions = {}): Point[][] {
  const gap = options.gap ?? LANE_GAP;
  const out = paths.map((path) => path.map((p) => ({ ...p })));

  for (let i = 0; i < out.length; i += 1) {
    const pts = out[i];
    for (let k = 1; k <= pts.length - 3; k += 1) {
      const a = pts[k];
      const b = pts[k + 1];
      const axis = segmentAxis(a, b);
      if (!axis) continue;
      const base = lineCoord(a, b, axis);
      const [lo, hi] = range(a, b, axis);

      const occupied: number[] = [];
      for (let j = 0; j < out.length; j += 1) {
        if (j === i) continue;
        const other = out[j];
        for (let m = 0; m < other.length - 1; m += 1) {
          if (j > i && !isAnchored(other.length, m)) continue;
          if (segmentAxis(other[m], other[m + 1]) !== axis) continue;
          const [olo, ohi] = range(other[m], other[m + 1], axis);
          if (Math.min(hi, ohi) - Math.max(lo, olo) <= MIN_OVERLAP) continue;
          occupied.push(lineCoord(other[m], other[m + 1], axis));
        }
      }
      if (occupied.every((c) => Math.abs(c - base) >= gap - EPS)) continue;

      const candidates = [...new Set(occupied.flatMap((c) => [c + gap, c - gap]))]
        .filter((c) => Math.abs(c - base) <= gap * MAX_LANES)
        .sort((p, q) => Math.abs(p - base) - Math.abs(q - base) || q - p);

      for (const c of candidates) {
        if (occupied.some((o) => Math.abs(o - c) < gap - EPS)) continue;
        if (!canShift(pts, k, axis, c, options.solid?.[i] ?? [])) continue;
        if (axis === "h") {
          a.y = c;
          b.y = c;
        } else {
          a.x = c;
          b.x = c;
        }
        break;
      }
    }
  }
  return out;
}

/** Would moving leg k to `c` keep its neighbours long enough and out of solid boxes? */
function canShift(pts: Point[], k: number, axis: Axis, c: number, solid: Rect[]): boolean {
  const get = (p: Point) => (axis === "h" ? p.y : p.x);
  const prev = pts[k - 1];
  const a = pts[k];
  const b = pts[k + 1];
  const next = pts[k + 2];
  const keepsLength = (from: number, to: number, newTo: number) => {
    const before = to - from;
    const after = newTo - from;
    if (Math.sign(before) !== Math.sign(after)) return false;
    return Math.abs(after) >= Math.min(MIN_ADJACENT, Math.abs(before));
  };
  if (!keepsLength(get(prev), get(a), c)) return false;
  // The next leg runs from b to next; measure from `next` back to the moved corner.
  if (!keepsLength(get(next), get(b), c)) return false;
  const from: Point = axis === "h" ? { x: a.x, y: c } : { x: c, y: a.y };
  const to: Point = axis === "h" ? { x: b.x, y: c } : { x: c, y: b.y };
  return !solid.some((rect) => segmentHitsRect(from, to, rect));
}

export type Crossing = {
  point: Point;
  /** Path whose horizontal leg hops over the other wire. */
  hopper: number;
  other: number;
};

/** Where do two orthogonal legs cross in the middle of both? Null for parallel legs and for touches at an end. */
export function segmentCrossing(a1: Point, a2: Point, b1: Point, b2: Point, tol = 1): Point | null {
  const axisA = segmentAxis(a1, a2);
  const axisB = segmentAxis(b1, b2);
  if (!axisA || !axisB || axisA === axisB) return null;
  const [h1, h2, v1, v2] = axisA === "h" ? [a1, a2, b1, b2] : [b1, b2, a1, a2];
  const x = (v1.x + v2.x) / 2;
  const y = (h1.y + h2.y) / 2;
  const insideH = x > Math.min(h1.x, h2.x) + tol && x < Math.max(h1.x, h2.x) - tol;
  const insideV = y > Math.min(v1.y, v2.y) + tol && y < Math.max(v1.y, v2.y) - tol;
  return insideH && insideV ? { x, y } : null;
}

/** Every place two different wires cross. The wire running horizontally there is the one that hops. */
export function findCrossings(paths: Point[][]): Crossing[] {
  const crossings: Crossing[] = [];
  for (let a = 0; a < paths.length; a += 1) {
    for (let b = a + 1; b < paths.length; b += 1) {
      for (let i = 0; i < paths[a].length - 1; i += 1) {
        for (let j = 0; j < paths[b].length - 1; j += 1) {
          const point = segmentCrossing(paths[a][i], paths[a][i + 1], paths[b][j], paths[b][j + 1]);
          if (!point) continue;
          const aHorizontal = segmentAxis(paths[a][i], paths[a][i + 1]) === "h";
          crossings.push({
            point,
            hopper: aHorizontal ? a : b,
            other: aHorizontal ? b : a,
          });
        }
      }
    }
  }
  return crossings;
}

/** Per path, the crossings it should draw a hop at. `noHop[i]` true keeps wire i flat (USB cables). */
export function hopPoints(paths: Point[][], noHop: boolean[] = []): Point[][] {
  const hops: Point[][] = paths.map(() => []);
  for (const crossing of findCrossings(paths)) {
    if (noHop[crossing.hopper]) continue;
    hops[crossing.hopper].push(crossing.point);
  }
  return hops;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

function dedupe(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    out.push(p);
  }
  return out;
}

/** Straight-line stretch from `from` to `to` with a half-circle hop at each listed point that lies on it. */
function legWithHops(from: Point, to: Point, hops: Point[], hopRadius: number): string {
  const horizontal = Math.abs(from.y - to.y) < 0.5 && Math.abs(from.x - to.x) >= 0.5;
  let out = "";
  if (horizontal) {
    const dir = to.x > from.x ? 1 : -1;
    const room = hopRadius + 1;
    const here = hops
      .filter(
        (h) =>
          Math.abs(h.y - from.y) < 0.5 &&
          (h.x - from.x) * dir > room &&
          (to.x - h.x) * dir > room,
      )
      .sort((p, q) => (p.x - q.x) * dir);
    let lastX = Number.NEGATIVE_INFINITY * dir;
    for (const hop of here) {
      if ((hop.x - lastX) * dir < hopRadius * 2 + 2) continue;
      out += ` L ${fmt(hop.x - dir * hopRadius)} ${fmt(from.y)}`;
      out += ` A ${hopRadius} ${hopRadius} 0 0 ${dir > 0 ? 1 : 0} ${fmt(hop.x + dir * hopRadius)} ${fmt(from.y)}`;
      lastX = hop.x;
    }
  }
  return `${out} L ${fmt(to.x)} ${fmt(to.y)}`;
}

/**
 * SVG path for an orthogonal wire: small rounded corners and, at each of the
 * `hops` points on a horizontal leg, a little arc over the wire it crosses.
 * Hops too close to a corner or to each other are left out.
 */
export function roundedPath(
  input: Point[],
  hops: Point[] = [],
  radius = CORNER_RADIUS,
  hopRadius = HOP_RADIUS,
): string {
  const pts = dedupe(input);
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;

  const corner = (i: number) => {
    const len = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
    return Math.min(radius, len(pts[i - 1], pts[i]) / 2, len(pts[i], pts[i + 1]) / 2);
  };
  const unit = (a: Point, b: Point): Point => {
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  };

  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  let cursor = pts[0];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const r = corner(i);
    const inDir = unit(pts[i - 1], pts[i]);
    const outDir = unit(pts[i], pts[i + 1]);
    const enter = { x: pts[i].x - inDir.x * r, y: pts[i].y - inDir.y * r };
    const leave = { x: pts[i].x + outDir.x * r, y: pts[i].y + outDir.y * r };
    d += legWithHops(cursor, enter, hops, hopRadius);
    d += ` Q ${fmt(pts[i].x)} ${fmt(pts[i].y)} ${fmt(leave.x)} ${fmt(leave.y)}`;
    cursor = leave;
  }
  d += legWithHops(cursor, pts[pts.length - 1], hops, hopRadius);
  return d;
}
