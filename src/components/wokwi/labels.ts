import { getCatalogPart } from "@/lib/catalog";
import { COLORS, LABEL_H, LABEL_PAD } from "./constants";
import type { Point, Rect, Wire } from "./types";

export function labelSize(text: string): { w: number; h: number } {
  return {
    w: Math.min(148, Math.max(40, text.length * 6.1 + 14)),
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

export function samplePathPoints(points: Point[]): Point[] {
  const samples: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    samples.push(a);
    samples.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });
    samples.push({
      x: a.x + (b.x - a.x) * 0.25,
      y: a.y + (b.y - a.y) * 0.25,
    });
    samples.push({
      x: a.x + (b.x - a.x) * 0.75,
      y: a.y + (b.y - a.y) * 0.75,
    });
  }
  if (points.length > 0) samples.push(points[points.length - 1]);
  const mid = points[Math.floor(points.length / 2)];
  if (mid) samples.unshift(mid);
  return samples;
}

export function labelCandidates(points: Point[]): Point[] {
  const bases = samplePathPoints(points);
  const offsets = [
    { x: 0, y: -20 },
    { x: 0, y: 20 },
    { x: 0, y: 0 },
    { x: 26, y: -16 },
    { x: -26, y: -16 },
    { x: 26, y: 16 },
    { x: -26, y: 16 },
    { x: 40, y: 0 },
    { x: -40, y: 0 },
    { x: 0, y: -36 },
    { x: 0, y: 36 },
    { x: 52, y: -26 },
    { x: -52, y: -26 },
    { x: 52, y: 26 },
    { x: -52, y: 26 },
    { x: 64, y: -8 },
    { x: -64, y: -8 },
    { x: 18, y: -44 },
    { x: -18, y: -44 },
    { x: 18, y: 44 },
    { x: -18, y: 44 },
  ];
  const out: Point[] = [];
  for (const base of bases) {
    for (const offset of offsets) {
      out.push({ x: base.x + offset.x, y: base.y + offset.y });
    }
  }
  return out;
}

export function resolveLabelPositions(wires: Wire[], obstacles: Rect[]): void {
  const placedLabels: Rect[] = [];
  const labeled = wires
    .filter((wire) => wire.showLabel)
    .sort((a, b) => b.label.length - a.label.length);

  for (const wire of labeled) {
    const anchor = { ...wire.mid };
    const candidates = labelCandidates(wire.points);
    let best: Point | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      if (candidate.x < 10 || candidate.y < 10) continue;
      const box = labelRect(candidate, wire.label);
      if (placedLabels.some((rect) => rectsOverlap(box, rect, 6))) continue;
      if (obstacles.some((obs) => rectsOverlap(box, obs, 4))) continue;
      const dist =
        Math.abs(candidate.x - anchor.x) + Math.abs(candidate.y - anchor.y);
      if (dist < bestScore) {
        bestScore = dist;
        best = candidate;
      }
      if (dist < 10) break;
    }

    if (!best) {
      for (let ring = 1; ring <= 12 && !best; ring += 1) {
        const step = 18 + ring * 4;
        const fallbacks = [
          { x: anchor.x, y: anchor.y - step * ring },
          { x: anchor.x, y: anchor.y + step * ring },
          { x: anchor.x + step * ring, y: anchor.y },
          { x: anchor.x - step * ring, y: anchor.y },
          { x: anchor.x + step * ring, y: anchor.y - step * ring },
          { x: anchor.x - step * ring, y: anchor.y - step * ring },
          { x: anchor.x + step * ring, y: anchor.y + step * ring },
          { x: anchor.x - step * ring, y: anchor.y + step * ring },
        ];
        for (const candidate of fallbacks) {
          if (candidate.x < 10 || candidate.y < 10) continue;
          const box = labelRect(candidate, wire.label);
          if (placedLabels.some((rect) => rectsOverlap(box, rect, 6))) continue;
          if (obstacles.some((obs) => rectsOverlap(box, obs, 4))) continue;
          best = candidate;
          break;
        }
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

export function pinLabel(catalogId: string, pinId: string): string {
  const catalog = getCatalogPart(catalogId);
  const pin = catalog?.pins.find((entry) => entry.id === pinId);
  return pin?.label || pinId;
}
