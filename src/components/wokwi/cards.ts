import { clampRectInto, rectInside } from "./bounds";
import { BADGE_R, badgeRect } from "./badges";
import { rectsOverlap, segmentIntersectsRect, labelSize } from "./labels";
import type { Bounds, Point, Rect, Wire } from "./types";

/** Longest wire text a card shows before it is cut with an ellipsis. */
export const CARD_MAX_CHARS = 42;
const WIRE_CLEARANCE = 3;
const RING_STEP = 18;
const MAX_RINGS = 44;
const ANGLES = 16;

/** Card text: the wire's label, cut with an ellipsis when it is long. */
export function cardText(label: string): string {
  const text = label.replace(/\s+/g, " ").trim();
  return text.length > CARD_MAX_CHARS ? `${text.slice(0, CARD_MAX_CHARS - 1)}…` : text;
}

export type CardRequest = {
  id: string;
  /** Take the least-bad spot when no clear one exists. Otherwise the card is left out. */
  relax: boolean;
};

export type CardPlacement = {
  id: string;
  text: string;
  rect: Rect;
  /** Point on the wire the card points at. */
  anchor: Point;
  /** Short line from the card edge to the wire. */
  leader: { from: Point; to: Point };
  /** True when no collision-free spot existed. */
  crowded: boolean;
};

export type CardScene = {
  wires: Wire[];
  partRects: Rect[];
  bounds: Bounds;
  /** Boxes that stay put: pill labels and every badge. */
  fixedRects: Rect[];
};

/** Do the segments p1-p2 and q1-q2 cross? (Proper intersection of two arbitrary segments.) */
export function segmentsCross(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const orient = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = orient(q1, q2, p1);
  const d2 = orient(q1, q2, p2);
  const d3 = orient(p1, p2, q1);
  const d4 = orient(p1, p2, q2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function nearestOnRect(p: Point, rect: Rect): Point {
  return {
    x: Math.max(rect.x, Math.min(p.x, rect.x + rect.w)),
    y: Math.max(rect.y, Math.min(p.y, rect.y + rect.h)),
  };
}

/**
 * Put a text card for each requested wire in clear space inside `scene.bounds`.
 * Cards are tried on rings around the wire's badge, nearest first. A clear spot
 * overlaps no wire, part, badge, pill label or earlier card. A leader that
 * crosses other wires costs extra, so the quietest of the nearby spots wins.
 * Requests come out in order; a request with no clear spot is skipped unless it
 * may `relax`. Deterministic.
 */
export function placeCards(requests: CardRequest[], scene: CardScene): CardPlacement[] {
  const out: CardPlacement[] = [];
  const placed: Rect[] = [];

  for (const request of requests) {
    const wireIndex = scene.wires.findIndex((wire) => wire.id === request.id);
    const wire = scene.wires[wireIndex];
    if (!wire) continue;
    const anchor = wire.badge ?? wire.mid;
    const own = wire.badge ? badgeRect(wire.badge) : null;
    const text = cardText(wire.label);
    const size = labelSize(text);

    const evaluate = (rect: Rect) => {
      let hits = 0;
      if (!rectInside(rect, scene.bounds)) hits += 1;
      for (const r of placed) if (rectsOverlap(rect, r, 4)) hits += 1;
      for (const r of scene.fixedRects) {
        if (own && r.x === own.x && r.y === own.y) continue;
        if (rectsOverlap(rect, r, 3)) hits += 1;
      }
      for (const r of scene.partRects) if (rectsOverlap(rect, r, 2)) hits += 1;
      const grown: Rect = {
        x: rect.x - WIRE_CLEARANCE,
        y: rect.y - WIRE_CLEARANCE,
        w: rect.w + WIRE_CLEARANCE * 2,
        h: rect.h + WIRE_CLEARANCE * 2,
      };
      for (const other of scene.wires) {
        for (let i = 0; i < other.points.length - 1; i += 1) {
          if (segmentIntersectsRect(other.points[i], other.points[i + 1], grown)) hits += 1;
        }
      }
      return hits;
    };

    let bestClear: { rect: Rect; cost: number } | null = null;
    let bestAny: { rect: Rect; cost: number; hits: number } | null = null;
    let clearRing = -1;

    for (let ring = 0; ring < MAX_RINGS; ring += 1) {
      if (bestClear && ring > clearRing + 2) break;
      const r = 12 + ring * RING_STEP;
      for (let a = 0; a < ANGLES; a += 1) {
        const angle = (a / ANGLES) * Math.PI * 2;
        const center = {
          x: anchor.x + Math.cos(angle) * (size.w / 2 + r),
          y: anchor.y + Math.sin(angle) * (size.h / 2 + r),
        };
        const rect = clampRectInto(
          { x: center.x - size.w / 2, y: center.y - size.h / 2, w: size.w, h: size.h },
          scene.bounds,
        );
        const edge = nearestOnRect(anchor, rect);
        const dist = Math.hypot(edge.x - anchor.x, edge.y - anchor.y);
        // The card must leave its own badge visible: no closer than a hair outside it.
        const hits = evaluate(rect) + (dist < BADGE_R + 3 ? 1 : 0);
        let crossings = 0;
        for (const other of scene.wires) {
          if (other.id === wire.id) continue;
          for (let i = 0; i < other.points.length - 1; i += 1) {
            if (segmentsCross(edge, anchor, other.points[i], other.points[i + 1])) crossings += 1;
          }
        }
        const cost = dist + crossings * 80;
        if (hits === 0) {
          if (!bestClear || cost < bestClear.cost) bestClear = { rect, cost };
          if (clearRing < 0) clearRing = ring;
        }
        const anyCost = hits * 10000 + cost;
        if (!bestAny || anyCost < bestAny.cost) bestAny = { rect, cost: anyCost, hits };
      }
    }

    const chosen = bestClear ? bestClear.rect : request.relax && bestAny ? bestAny.rect : null;
    if (!chosen) continue;
    placed.push(chosen);
    out.push({
      id: wire.id,
      text,
      rect: chosen,
      anchor,
      leader: { from: nearestOnRect(anchor, chosen), to: anchor },
      crowded: !bestClear,
    });
  }
  return out;
}
