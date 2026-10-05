import { getCatalogPart } from "@/lib/catalog";
import { COLORS, LABEL_H, LABEL_PAD } from "./constants";
import type { Point, Rect, Wire } from "./types";

export function labelSize(text: string): { w: number; h: number } {
  return {
    w: Math.min(320, Math.max(52, text.length * 8 + 18)),
    h: LABEL_H,
  };
}

export function labelRect(center: Point, text: string): Rect {
  const size = labelSize(text);
  return {
    x: center.x - size.w / 2,
    y: center.y - size.h / 2,
    w: size.w,
    h: size.h,
  };
}

export function rectsOverlap(a: Rect, b: Rect, pad = LABEL_PAD): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

/** Point `dist` px along the path from its first point (clamped to the end). */
export function pointAlongPath(points: Point[], dist: number): Point {
  let left = Math.max(0, dist);
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len >= left && len > 0) {
      const t = left / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= len;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
}

/** Does the segment a-b touch or cross the rectangle (Liang-Barsky clip)? */
export function segmentIntersectsRect(a: Point, b: Point, rect: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const checks: Array<[number, number]> = [
    [-dx, a.x - rect.x],
    [dx, rect.x + rect.w - a.x],
    [-dy, a.y - rect.y],
    [dy, rect.y + rect.h - a.y],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1;
}

const SLIDE_STEP = 8;
const WIRE_CLEARANCE = 3;
const BESIDE_GAP = 8;

type LabelCandidate = { center: Point; seg: number; beside: boolean };

/**
 * Spots for a label: every few px along every leg of the wire (sitting on the
 * wire, which then passes under the pill) and, failing that, just beside it.
 */
export function labelCandidates(points: Point[], text: string): LabelCandidate[] {
  const size = labelSize(text);
  const out: LabelCandidate[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1) continue;
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const gap = horizontal ? size.h / 2 + BESIDE_GAP : size.w / 2 + BESIDE_GAP;
    const steps = Math.max(1, Math.round(len / SLIDE_STEP));
    for (let k = 0; k <= steps; k += 1) {
      const t = k / steps;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push({ center: p, seg: i, beside: false });
      for (const sign of [-1, 1]) {
        out.push({
          center: horizontal ? { x: p.x, y: p.y + sign * gap } : { x: p.x + sign * gap, y: p.y },
          seg: i,
          beside: true,
        });
      }
    }
  }
  return out;
}

/**
 * How many things the label box would sit on: other labels, parts, wire legs
 * (its own leg excluded, so the wire may pass under its own pill) and wire
 * end dots. Zero means a clear spot.
 */
export function labelCollisions(
  box: Rect,
  wireIndex: number,
  seg: number,
  wires: Wire[],
  obstacles: Rect[],
  placed: Rect[],
): number {
  let hits = 0;
  for (const rect of placed) if (rectsOverlap(box, rect, 6)) hits += 1;
  for (const obs of obstacles) if (rectsOverlap(box, obs, 4)) hits += 1;
  const grown: Rect = {
    x: box.x - WIRE_CLEARANCE,
    y: box.y - WIRE_CLEARANCE,
    w: box.w + WIRE_CLEARANCE * 2,
    h: box.h + WIRE_CLEARANCE * 2,
  };
  wires.forEach((wire, wi) => {
    for (let i = 0; i < wire.points.length - 1; i += 1) {
      if (wi === wireIndex && i === seg) continue;
      if (segmentIntersectsRect(wire.points[i], wire.points[i + 1], grown)) hits += 1;
    }
    for (const end of [wire.from, wire.to]) {
      if (
        end.x >= box.x - 5 &&
        end.x <= box.x + box.w + 5 &&
        end.y >= box.y - 5 &&
        end.y <= box.y + box.h + 5
      ) {
        hits += 1;
      }
    }
  });
  return hits;
}

/**
 * Place each pill label on a clear spot: no overlap with another wire, its own
 * wire's other legs, other labels or parts. The label starts at its wire's
 * `mid` (or where the caller put it) and slides along the wire to the nearest
 * clear spot. If nothing is clear it takes the least-bad spot; the pill is
 * drawn with a solid background so the text stays readable.
 */
export function resolveLabelPositions(wires: Wire[], obstacles: Rect[]): void {
  const placedLabels: Rect[] = [];
  const order = wires
    .map((wire, index) => ({ wire, index }))
    .filter(({ wire }) => wire.showLabel)
    .sort((a, b) => b.wire.label.length - a.wire.label.length || a.index - b.index);

  for (const { wire, index } of order) {
    const anchor = { ...wire.mid };
    const candidates: LabelCandidate[] = labelCandidates(wire.points, wire.label);
    for (let ring = 1; ring <= 8; ring += 1) {
      const step = 24 * ring;
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [1, 0],
        [-1, 0],
        [1, -1],
        [-1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        candidates.push({
          center: { x: anchor.x + dx * step, y: anchor.y + dy * step },
          seg: -1,
          beside: true,
        });
      }
    }

    let best: Point | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const { center } = candidate;
      if (center.x < 10 || center.y < 10) continue;
      const box = labelRect(center, wire.label);
      const hits = labelCollisions(box, index, candidate.seg, wires, obstacles, placedLabels);
      const dist = Math.abs(center.x - anchor.x) + Math.abs(center.y - anchor.y);
      const score = hits * 10000 + dist + (candidate.beside ? 14 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = center;
      }
    }

    if (best) {
      wire.mid = best;
      placedLabels.push(labelRect(best, wire.label));
    } else {
      wire.showLabel = false;
    }
  }
}

export function wireColor(index: number, label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("gnd") || lower.includes("vss") || lower.includes("−") || lower.includes("- rail") || lower.startsWith("−")) {
    return "#212121";
  }
  if (
    lower.includes("vcc") ||
    lower.includes("vin") ||
    lower.includes("5v") ||
    lower.includes("3v") ||
    lower.includes("v+") ||
    lower.includes("+")
  ) {
    return "#c62828";
  }
  if (lower.includes("sda") || lower.includes("data") || lower.includes("scl") || lower.includes("clk")) {
    return "#6a1b9a";
  }
  return COLORS[index % COLORS.length];
}

export type WireRole = "ground" | "power" | "signal";

/** Ground and power get fixed colours (black, red); everything else is a signal. */
export function wireRole(label: string): WireRole {
  const lower = label.toLowerCase();
  if (lower.includes("gnd") || lower.includes("vss") || lower.includes("−") || lower.includes("- rail") || lower.startsWith("−")) {
    return "ground";
  }
  if (
    lower.includes("vcc") ||
    lower.includes("vin") ||
    lower.includes("5v") ||
    lower.includes("3v") ||
    lower.includes("v+") ||
    lower.includes("+")
  ) {
    return "power";
  }
  return "signal";
}

/** Colours for signal wires. Red and black are reserved for power and ground. */
export const SIGNAL_WIRE_PALETTE = [
  "#1565c0",
  "#2e7d32",
  "#ef6c00",
  "#6a1b9a",
  "#00838f",
  "#ad1457",
  "#795548",
  "#f9a825",
  "#546e7a",
] as const;

/**
 * One colour per wire, index-aligned with `labels`: power red, ground black,
 * and each signal wire its own colour until the palette runs out. The diagram
 * and the written checklist must both use this so the colours always match.
 */
export function assignWireColors(labels: string[]): string[] {
  let signalIndex = 0;
  return labels.map((label) => {
    const role = wireRole(label);
    if (role === "ground") return "#212121";
    if (role === "power") return "#c62828";
    const color = SIGNAL_WIRE_PALETTE[signalIndex % SIGNAL_WIRE_PALETTE.length];
    signalIndex += 1;
    return color;
  });
}

export function pinLabel(catalogId: string, pinId: string): string {
  const catalog = getCatalogPart(catalogId);
  const pin = catalog?.pins.find((entry) => entry.id === pinId);
  return pin?.label || pinId;
}

const WIRE_COLOR_NAMES: Record<string, string> = {
  "#212121": "black",
  "#c62828": "red",
  "#1565c0": "blue",
  "#2e7d32": "green",
  "#ef6c00": "orange",
  "#6a1b9a": "purple",
  "#00838f": "teal",
  "#546e7a": "grey",
  "#78909c": "grey",
  "#ad1457": "pink",
  "#795548": "brown",
  "#f9a825": "yellow",
};

/** Plain colour name for a wire colour, e.g. "red". */
export function wireColorName(hex: string): string {
  return WIRE_COLOR_NAMES[hex.toLowerCase()] ?? "coloured";
}

/** Closest point on a polyline to `p`, and how far away it is. */
export function nearestPointOnPath(points: Point[], p: Point): { point: Point; dist: number } {
  let best: Point = points[0] ?? p;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bestDist) {
      bestDist = d;
      best = q;
    }
  }
  if (points.length === 1) bestDist = Math.hypot(p.x - best.x, p.y - best.y);
  return { point: best, dist: bestDist };
}

/**
 * A short line from a label pill to its wire, or null when the pill already
 * sits on the wire. The line starts on the pill's edge.
 */
export function labelLeader(points: Point[], center: Point, text: string): { from: Point; to: Point } | null {
  const { point, dist } = nearestPointOnPath(points, center);
  const size = labelSize(text);
  const rect = labelRect(center, text);
  const onWire = point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  if (onWire || dist < 1) return null;
  // Clip the centre-to-wire segment against the pill to find where it leaves the pill.
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const sx = dx === 0 ? Number.POSITIVE_INFINITY : size.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Number.POSITIVE_INFINITY : size.h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy, 1);
  return { from: { x: center.x + dx * s, y: center.y + dy * s }, to: point };
}
