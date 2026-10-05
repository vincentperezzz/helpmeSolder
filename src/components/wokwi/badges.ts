import { pointAlongPath } from "./labels";
import type { Point, Rect, Wire } from "./types";

/** Radius of the numbered badge drawn on a wire (a 19px disc). */
export const BADGE_R = 9.5;
const STEP = 4;
const START_DIST = BADGE_R + 4;

export function badgeRect(center: Point): Rect {
  return { x: center.x - BADGE_R, y: center.y - BADGE_R, w: BADGE_R * 2, h: BADGE_R * 2 };
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}

/** Text colour that stays readable on a badge filled with `hex`. */
export function badgeTextColor(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? "#1a242b" : "#ffffff";
}

function circleHitsRect(c: Point, rect: Rect, r: number): boolean {
  const nx = Math.max(rect.x, Math.min(c.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(c.y, rect.y + rect.h));
  return Math.hypot(c.x - nx, c.y - ny) < r;
}

export type BadgeInput = {
  /** Wire id to its 1-based number in the written checklist. Wires without a number get no badge. */
  numbers: ReadonlyMap<string, number>;
  /** Which end of each wire the badge sits near; default "from". */
  ends?: ReadonlyMap<string, "from" | "to">;
  /** Pill labels and other boxes a badge must not cover. */
  fixedRects?: Rect[];
  /** Part bodies: a badge prefers not to sit on one. */
  partRects?: Rect[];
};

/**
 * Give every numbered wire a badge centre on the wire, a short way from its
 * part end. Candidates run along the wire every few px; the cheapest wins:
 * cost is distance from the start plus heavy penalties for covering another
 * badge, label, wire or wire end, and a light one for sitting on a part. Sets
 * `wire.number` and `wire.badge`. Deterministic: wires are handled in number order.
 */
export function placeBadges(wires: Wire[], input: BadgeInput): void {
  const order = wires
    .map((wire, index) => ({ wire, index }))
    .filter(({ wire }) => input.numbers.has(wire.id))
    .sort((a, b) => (input.numbers.get(a.wire.id) as number) - (input.numbers.get(b.wire.id) as number) || a.index - b.index);

  const placed: Point[] = [];
  for (const { wire, index } of order) {
    wire.number = input.numbers.get(wire.id);
    wire.badge = undefined;
    const preferred = input.ends?.get(wire.id) ?? "from";
    const total = pathLength(wire.points);
    if (wire.points.length < 2 || total < 1) continue;

    type Cand = { point: Point; cost: number };
    let best: Cand | null = null;
    for (const end of ["from", "to"] as const) {
      const path = end === "from" ? wire.points : [...wire.points].reverse();
      const endBias = end === preferred ? 0 : 60;
      const dists: number[] = [];
      for (let d = START_DIST; d <= total - START_DIST + 0.01; d += STEP) dists.push(d);
      if (dists.length === 0) dists.push(total / 2);
      for (const d of dists) {
        const point = pointAlongPath(path, d);
        let cost = d + endBias;
        for (const other of placed) {
          if (Math.hypot(point.x - other.x, point.y - other.y) < BADGE_R * 2 + 2) cost += 5000;
        }
        for (const rect of input.fixedRects ?? []) {
          if (circleHitsRect(point, rect, BADGE_R + 2)) cost += 3000;
        }
        for (const rect of input.partRects ?? []) {
          if (circleHitsRect(point, rect, 0)) cost += 60;
        }
        wires.forEach((other, oi) => {
          if (oi === index) return;
          for (let i = 0; i < other.points.length - 1; i += 1) {
            if (distToSegment(point, other.points[i], other.points[i + 1]) < BADGE_R + 2) cost += 400;
          }
          for (const dot of [other.from, other.to]) {
            if (Math.hypot(point.x - dot.x, point.y - dot.y) < BADGE_R + 5) cost += 600;
          }
        });
        if (!best || cost < best.cost) best = { point, cost };
      }
    }
    if (best) {
      wire.badge = best.point;
      placed.push(best.point);
    }
  }
}

/** Rects of every placed badge, for boxes that must stay clear of them. */
export function badgeRects(wires: Wire[]): Rect[] {
  return wires.flatMap((wire) => (wire.badge ? [badgeRect(wire.badge)] : []));
}
