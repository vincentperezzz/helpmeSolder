"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BatteryAssetVisual, UsbWallVisual } from "@/components/BatteryAssets";
import { BoardAssetVisual } from "@/components/BoardAssets";
import { getCatalogPart } from "@/lib/catalog";
import {
  getDiagramAsset,
  prefersDiagramAsset,
} from "@/lib/catalog/board-assets";
import { getBatteryAsset, type BatteryKind } from "@/lib/catalog/batteries";
import type { Guide, PowerSource } from "@/lib/catalog/types";
import {
  type BatteryPowerSource,
  isBatteryPowerSource,
} from "@/lib/guides/power-source";
import { hasWokwiVisual, wokwiAttrs } from "@/lib/catalog/wokwi";

type WokwiDiagramProps = {
  guide: Guide;
  enlarged?: boolean;
  onEnlargedChange?: (enlarged: boolean) => void;
};

type PinInfo = { name: string; x: number; y: number };
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type ExitDir = { dx: number; dy: number };

const STUB_BASE = 18;
const STUB_SPREAD = 4;
const POWER_ORIGIN = { x: 24, y: 24 };

type PlacedPart = {
  instanceId: string;
  catalogId: string;
  tag?: string;
  attrs: Record<string, string>;
  x: number;
  y: number;
  name: string;
  kind: "board" | "module" | "passive" | "power";
  seated?: boolean;
};

type Wire = {
  id: string;
  color: string;
  d: string;
  label: string;
  showLabel: boolean;
  mid: Point;
  from: Point;
  to: Point;
  points: Point[];
};

const COLORS = [
  "#c62828",
  "#1565c0",
  "#2e7d32",
  "#ef6c00",
  "#6a1b9a",
  "#00838f",
  "#546e7a",
  "#ad1457",
];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.2;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
const BB_PITCH = 10;
const BB_COLS = 30;
const BB_MARGIN_X = 24;
const BB_WIDTH = BB_MARGIN_X * 2 + (BB_COLS - 1) * BB_PITCH;
const BB_HEIGHT = 196;
const BB_ORIGIN_X = BB_MARGIN_X;
const BB_STEP = BB_PITCH;
const LABEL_H = 16;
const LABEL_PAD = 6;
const BB_RAIL_Y = {
  topPlus: 14,
  topMinus: 24,
  botPlus: 172,
  botMinus: 182,
} as const;
const BB_ROW_Y: Record<string, number> = {
  a: 42,
  b: 52,
  c: 62,
  d: 72,
  e: 82,
  f: 112,
  g: 122,
  h: 132,
  i: 142,
  j: 152,
};

function labelSize(text: string): { w: number; h: number } {
  return {
    w: Math.min(148, Math.max(40, text.length * 6.1 + 14)),
    h: LABEL_H,
  };
}

function labelRect(center: Point, text: string): Rect {
  const size = labelSize(text);
  return {
    x: center.x - size.w / 2,
    y: center.y - size.h / 2,
    w: size.w,
    h: size.h,
  };
}

function rectsOverlap(a: Rect, b: Rect, pad = LABEL_PAD): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function samplePathPoints(points: Point[]): Point[] {
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

function labelCandidates(points: Point[]): Point[] {
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

function resolveLabelPositions(wires: Wire[], obstacles: Rect[]): void {
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

function wireColor(index: number, label: string): string {
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

function pinLabel(catalogId: string, pinId: string): string {
  const catalog = getCatalogPart(catalogId);
  const pin = catalog?.pins.find((entry) => entry.id === pinId);
  return pin?.label || pinId;
}

function isBreadboardId(catalogId: string): boolean {
  return catalogId.includes("breadboard");
}

function parseBreadboardRail(
  pinId: string,
): { side: "t" | "b"; polarity: "+" | "-"; col: number } | null {
  if (pinId === "+") return { side: "t", polarity: "+", col: 2 };
  if (pinId === "-") return { side: "b", polarity: "-", col: 2 };
  if (pinId === "+.t") return { side: "t", polarity: "+", col: 2 };
  if (pinId === "-.t") return { side: "t", polarity: "-", col: 2 };
  if (pinId === "+.b") return { side: "b", polarity: "+", col: 2 };
  if (pinId === "-.b") return { side: "b", polarity: "-", col: 2 };
  const match = /^([+-])\.(t|b)\.(\d+)$/i.exec(pinId);
  if (!match) return null;
  const col = Number(match[3]);
  if (col < 1 || col > BB_COLS) return null;
  return {
    polarity: match[1] as "+" | "-",
    side: match[2].toLowerCase() as "t" | "b",
    col,
  };
}

function breadboardRailY(side: "t" | "b", polarity: "+" | "-"): number {
  if (side === "t") {
    return polarity === "+" ? BB_RAIL_Y.topPlus : BB_RAIL_Y.topMinus;
  }
  return polarity === "+" ? BB_RAIL_Y.botPlus : BB_RAIL_Y.botMinus;
}

function breadboardHoleLocal(pinId: string): Point | null {
  const rail = parseBreadboardRail(pinId);
  if (rail) {
    return {
      x: BB_ORIGIN_X + (rail.col - 1) * BB_STEP,
      y: breadboardRailY(rail.side, rail.polarity),
    };
  }
  const match = /^([a-j])(\d+)$/i.exec(pinId);
  if (!match) return null;
  const row = match[1].toLowerCase();
  const col = Number(match[2]);
  const rowY = BB_ROW_Y[row];
  if (!rowY || col < 1 || col > BB_COLS) return null;
  return {
    x: BB_ORIGIN_X + (col - 1) * BB_STEP,
    y: rowY,
  };
}

function breadboardCol(pinId: string): number | null {
  const rail = parseBreadboardRail(pinId);
  if (rail) return rail.col;
  const match = /^[a-j](\d+)$/i.exec(pinId);
  return match ? Number(match[1]) : null;
}

function pointInRect(point: Point, rect: Rect, pad = 0): boolean {
  return (
    point.x >= rect.x - pad &&
    point.x <= rect.x + rect.w + pad &&
    point.y >= rect.y - pad &&
    point.y <= rect.y + rect.h + pad
  );
}

function segmentHitsRect(a: Point, b: Point, rect: Rect): boolean {
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

function segmentDeepHit(a: Point, b: Point, obstacle: Rect): boolean {
  if (!segmentHitsRect(a, b, obstacle)) return false;
  const aInside = pointInRect(a, obstacle, 4);
  const bInside = pointInRect(b, obstacle, 4);
  if (aInside && bInside) return true;
  if (!aInside && !bInside) return true;
  const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const maxStub = Math.min(obstacle.w, obstacle.h) * 0.35 + 20;
  return len > maxStub;
}

function pathCrossesObstacles(points: Point[], obstacles: Rect[]): boolean {
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

function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total +=
      Math.abs(points[i + 1].x - points[i].x) +
      Math.abs(points[i + 1].y - points[i].y);
  }
  return total;
}

function stubLength(index: number): number {
  return STUB_BASE + (index % 3) * STUB_SPREAD;
}

function stubPoint(pin: Point, dir: ExitDir, len: number): Point {
  return { x: pin.x + dir.dx * len, y: pin.y + dir.dy * len };
}

function pinExitDirection(pinLocal: Point, allPinsLocal: Point[]): ExitDir {
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

function breadboardPinExit(pinId: string): ExitDir {
  const rail = parseBreadboardRail(pinId);
  if (rail) {
    return rail.side === "t" ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 };
  }
  const match = /^([a-j])/i.exec(pinId);
  if (!match) return { dx: 0, dy: -1 };
  const row = match[1].toLowerCase();
  return row <= "e" ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 };
}

function exitFromBodyCenter(pin: Point, center: Point): ExitDir {
  const vx = pin.x - center.x;
  const vy = pin.y - center.y;
  if (Math.abs(vx) >= Math.abs(vy)) {
    return { dx: vx >= 0 ? 1 : -1, dy: 0 };
  }
  return { dx: 0, dy: vy >= 0 ? 1 : -1 };
}

function segmentsOverlap(
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

function pathWireOverlap(points: Point[], prior: Point[][]): number {
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

function inflateObstacles(obstacles: Rect[], inset = 10): Rect[] {
  return obstacles.map((obs) => ({
    x: obs.x + inset,
    y: obs.y + inset,
    w: Math.max(8, obs.w - inset * 2),
    h: Math.max(8, obs.h - inset * 2),
  }));
}

function blockersForWire(from: Point, to: Point, obstacles: Rect[]): Rect[] {
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

function routedPath(
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

function seatPassiveOnBreadboard(
  part: PlacedPart,
  breadboard: PlacedPart,
  guide: Guide,
): boolean {
  const holePins = guide.connections.flatMap((connection) => {
    const ends = [connection.from, connection.to];
    const onBoard = ends.find((end) => end.instanceId === breadboard.instanceId);
    const onPart = ends.find((end) => end.instanceId === part.instanceId);
    if (!onBoard || !onPart) return [];
    return [onBoard.pinId];
  });
  if (holePins.length === 0) return false;

  const cols = holePins
    .map((pinId) => breadboardCol(pinId))
    .filter((col): col is number => col != null);
  const isLed = part.catalogId.includes(".led.");
  const isResistor = part.catalogId.includes("resistor");
  const usesTopRail = holePins.some((pinId) => {
    const rail = parseBreadboardRail(pinId);
    return rail?.side === "t";
  });
  const usesBotRail = holePins.some((pinId) => {
    const rail = parseBreadboardRail(pinId);
    return rail?.side === "b";
  });

  if (cols.length === 0) {
    part.x = breadboard.x + 48;
    part.y = breadboard.y + (isLed ? 42 : 70);
    part.seated = true;
    return true;
  }

  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const midCol = (minCol + maxCol) / 2;
  const midX = BB_ORIGIN_X + (midCol - 1) * BB_STEP;

  if (isResistor) {
    part.x = breadboard.x + midX - 28;
    part.y = breadboard.y + BB_ROW_Y.e - 8;
  } else if (isLed) {
    const colX = BB_ORIGIN_X + (maxCol - 1) * BB_STEP;
    part.x = breadboard.x + colX - 10;
    if (usesTopRail && !usesBotRail) {
      part.y = breadboard.y + BB_ROW_Y.a - 6;
    } else if (usesBotRail && !usesTopRail) {
      part.y = breadboard.y + BB_ROW_Y.j - 20;
    } else {
      part.y = breadboard.y + BB_ROW_Y.a - 4;
    }
  } else {
    part.x = breadboard.x + midX - 16;
    part.y = breadboard.y + BB_ROW_Y.c - 4;
  }
  part.seated = true;
  return true;
}

function layoutParts(guide: Guide): PlacedPart[] {
  const boards: PlacedPart[] = [];
  const passives: PlacedPart[] = [];
  const modules: PlacedPart[] = [];

  for (const part of guide.parts) {
    const catalog = getCatalogPart(part.catalogId);
    if (!catalog) continue;
    const placed: PlacedPart = {
      instanceId: part.instanceId,
      catalogId: part.catalogId,
      tag: catalog.wokwi?.tag,
      attrs: wokwiAttrs(catalog),
      x: 0,
      y: 0,
      name: part.label || catalog.name,
      kind: catalog.kind,
    };
    if (catalog.kind === "board") boards.push(placed);
    else if (catalog.kind === "passive") passives.push(placed);
    else modules.push(placed);
  }

  let boardY = 120;
  boards.forEach((part, index) => {
    part.x = 120;
    part.y = boardY;
    boardY += index === 0 ? 380 : 280;
  });

  const breadboards = passives.filter((part) => isBreadboardId(part.catalogId));
  const otherPassives = passives.filter((part) => !isBreadboardId(part.catalogId));

  let breadboardY = 120;
  breadboards.forEach((part) => {
    part.x = 620;
    part.y = breadboardY;
    breadboardY += BB_HEIGHT + 56;
  });

  const primaryBreadboard = breadboards[0];
  let freepassiveY = breadboardY;
  otherPassives.forEach((part) => {
    if (primaryBreadboard && seatPassiveOnBreadboard(part, primaryBreadboard, guide)) {
      return;
    }
    part.x = primaryBreadboard ? 1040 : 620;
    part.y = freepassiveY;
    freepassiveY += 120;
  });

  let moduleY = 120;
  modules.forEach((part) => {
    const tall =
      part.tag?.includes("lcd") ||
      part.tag?.includes("ili9341") ||
      part.tag?.includes("ssd1306");
    part.x = passives.length > 0 ? 1080 : 700;
    part.y = moduleY;
    moduleY += tall ? 300 : 200;
  });

  return [...boards, ...breadboards, ...otherPassives, ...modules];
}

function boardPowerPins(board: PlacedPart): { vin?: string; gnd?: string; usb?: string } {
  const catalog = getCatalogPart(board.catalogId);
  if (!catalog) return {};
  const ids = catalog.pins.map((pin) => pin.id);
  const vin =
    ids.find((id) => id.toUpperCase() === "VIN") ||
    ids.find((id) => id.toLowerCase() === "vin") ||
    ids.find((id) => id.toLowerCase() === "vbus") ||
    ids.find((id) => id === "5V");
  const gnd =
    ids.find((id) => id.startsWith("GND")) ||
    ids.find((id) => id.toLowerCase() === "gnd");
  const usb =
    ids.find((id) => id.toUpperCase() === "USB") ||
    ids.find((id) => id.toLowerCase() === "vbus") ||
    vin;
  return { vin, gnd, usb };
}

function BreadboardVisual({
  instanceId,
  name,
}: {
  instanceId: string;
  name: string;
}) {
  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];
  const hole = (cx: number, cy: number, key: string, fill = "#8f979c") => (
    <circle key={key} cx={cx} cy={cy} r={1.55} fill={fill} />
  );
  const colX = (col: number) => BB_ORIGIN_X + (col - 1) * BB_STEP;

  return (
    <div
      data-instance={instanceId}
      className="relative select-none"
      style={{ width: BB_WIDTH, height: BB_HEIGHT }}
    >
      <p className="pointer-events-none absolute -top-4 left-0 text-[10px] font-semibold tracking-wide text-ink-soft">
        {name}
      </p>
      <svg
        viewBox={`0 0 ${BB_WIDTH} ${BB_HEIGHT}`}
        width={BB_WIDTH}
        height={BB_HEIGHT}
        aria-label={name}
      >
        <rect
          x="0"
          y="0"
          width={BB_WIDTH}
          height={BB_HEIGHT}
          rx="5"
          fill="#f4efe4"
          stroke="#b9ae96"
        />
        <rect x="6" y="6" width={BB_WIDTH - 12} height={26} rx="2" fill="#f3d6d1" />
        <rect x="6" y={BB_HEIGHT - 32} width={BB_WIDTH - 12} height={26} rx="2" fill="#d6e3f1" />
        <line
          x1="10"
          y1={BB_RAIL_Y.topPlus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.topPlus}
          stroke="#c62828"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <line
          x1="10"
          y1={BB_RAIL_Y.topMinus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.topMinus}
          stroke="#1565c0"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <line
          x1="10"
          y1={BB_RAIL_Y.botPlus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.botPlus}
          stroke="#c62828"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <line
          x1="10"
          y1={BB_RAIL_Y.botMinus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.botMinus}
          stroke="#1565c0"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <text x="8" y={BB_RAIL_Y.topPlus + 3} fontSize="8" fill="#c62828" fontFamily="monospace">
          +
        </text>
        <text x="8" y={BB_RAIL_Y.topMinus + 3} fontSize="8" fill="#1565c0" fontFamily="monospace">
          −
        </text>
        <text x="8" y={BB_RAIL_Y.botPlus + 3} fontSize="8" fill="#c62828" fontFamily="monospace">
          +
        </text>
        <text x="8" y={BB_RAIL_Y.botMinus + 3} fontSize="8" fill="#1565c0" fontFamily="monospace">
          −
        </text>
        {Array.from({ length: BB_COLS }, (_, i) => {
          const col = i + 1;
          const x = colX(col);
          return (
            <g key={`rail-${col}`}>
              {hole(x, BB_RAIL_Y.topPlus, `tp-${col}`, "#b07171")}
              {hole(x, BB_RAIL_Y.topMinus, `tm-${col}`, "#6f86a8")}
              {hole(x, BB_RAIL_Y.botPlus, `bp-${col}`, "#b07171")}
              {hole(x, BB_RAIL_Y.botMinus, `bm-${col}`, "#6f86a8")}
            </g>
          );
        })}
        {rowsTop.map((row) =>
          Array.from({ length: BB_COLS }, (_, i) => {
            const col = i + 1;
            return hole(colX(col), BB_ROW_Y[row], `${row}${col}`);
          }),
        )}
        {rowsBot.map((row) =>
          Array.from({ length: BB_COLS }, (_, i) => {
            const col = i + 1;
            return hole(colX(col), BB_ROW_Y[row], `${row}${col}`);
          }),
        )}
        <rect
          x="16"
          y="94"
          width={BB_WIDTH - 32}
          height="10"
          rx="2"
          fill="#e7dcc8"
          opacity="0.95"
        />
        {[5, 10, 15, 20, 25, 30].map((col) => (
          <text
            key={`n-${col}`}
            x={colX(col)}
            y="102"
            textAnchor="middle"
            fontSize="7"
            fill="#8a7f6c"
            fontFamily="monospace"
          >
            {col}
          </text>
        ))}
      </svg>
    </div>
  );
}

const BATTERY_WIRE_ANCHORS: Record<
  BatteryPowerSource,
  { plus: Point; minus: Point; plusExit: ExitDir; minusExit: ExitDir }
> = (["battery_9v", "battery_2aa", "battery_3aa", "battery_18650"] as BatteryKind[]).reduce(
  (acc, kind) => {
    const asset = getBatteryAsset(kind);
    acc[kind] = {
      plus: {
        x: POWER_ORIGIN.x + asset.terminals.plus.x,
        y: POWER_ORIGIN.y + asset.terminals.plus.y,
      },
      minus: {
        x: POWER_ORIGIN.x + asset.terminals.minus.x,
        y: POWER_ORIGIN.y + asset.terminals.minus.y,
      },
      plusExit: asset.terminals.plusExit,
      minusExit: asset.terminals.minusExit,
    };
    return acc;
  },
  {} as Record<
    BatteryPowerSource,
    { plus: Point; minus: Point; plusExit: ExitDir; minusExit: ExitDir }
  >,
);

function PowerSourceVisual({
  source,
  x,
  y,
}: {
  source: PowerSource;
  x: number;
  y: number;
}) {
  if (source === "usb_wall") {
    return (
      <div
        data-instance="power-source"
        className="absolute"
        style={{ left: x, top: y, width: 150 }}
      >
        <UsbWallVisual />
      </div>
    );
  }

  const asset = getBatteryAsset(source);
  return (
    <div
      data-instance="power-source"
      className="absolute"
      style={{ left: x, top: y, width: asset.width }}
    >
      <BatteryAssetVisual kind={source} />
    </div>
  );
}

function SkeletonPart({
  instanceId,
  name,
  catalogId,
}: {
  instanceId: string;
  name: string;
  catalogId: string;
}) {
  const catalog = getCatalogPart(catalogId);
  return (
    <div
      data-instance={instanceId}
      className="rounded-md border border-line bg-paper-deep px-3 py-2"
      style={{ minWidth: 140 }}
    >
      <p className="text-xs font-semibold text-ink">{name}</p>
      <p className="font-mono text-[10px] text-mute">skeleton fallback</p>
      <ul className="mt-2 space-y-1">
        {catalog?.pins.slice(0, 8).map((pin) => (
          <li key={pin.id} className="font-mono text-[10px] text-ink-soft">
            {pin.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildCue(guide: Guide): string {
  const board = guide.board_id ? getCatalogPart(guide.board_id) : null;
  const hasBreadboard = guide.parts.some((part) => isBreadboardId(part.catalogId));
  const hasLed = guide.parts.some((part) => part.catalogId.includes(".led."));
  const hasResistor = guide.parts.some((part) => part.catalogId.includes("resistor"));
  if (hasBreadboard && hasLed && hasResistor) {
    return `Building: ${board?.name ?? "board"} blinks an LED through a breadboard + resistor`;
  }
  if (guide.title) return `Building: ${guide.title}`;
  return "Building: wiring prototype";
}

export function WokwiDiagram({
  guide,
  enlarged = false,
  onEnlargedChange,
}: WokwiDiagramProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [wires, setWires] = useState<Wire[]>([]);
  const [canvas, setCanvas] = useState({ width: 1400, height: 820 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [fullscreen, setFullscreen] = useState(false);
  const fittedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );
  const placed = useMemo(() => layoutParts(guide), [guide]);
  const cue = useMemo(() => buildCue(guide), [guide]);

  useEffect(() => {
    fittedRef.current = false;
  }, [guide.id]);

  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFullscreen(active);
      if (active) onEnlargedChange?.(true);
      fittedRef.current = false;
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [onEnlargedChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await import("@wokwi/elements");
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !hostRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const measure = () => {
      const host = hostRef.current;
      if (!host || cancelled) return;

      const anchors = new Map<string, Point>();
      const exitDirs = new Map<string, ExitDir>();
      const obstacles: Rect[] = [];
      let maxRight = 1200;
      let maxBottom = 720;
      let boardsReady = true;

      for (const part of placed) {
        const node = host.querySelector(
          `[data-instance="${part.instanceId}"]`,
        ) as (HTMLElement & { pinInfo?: PinInfo[] | (() => PinInfo[]) }) | null;
        if (!node) {
          if (part.kind === "board") boardsReady = false;
          continue;
        }

        const offsetX = part.x;
        const offsetY = part.y;
        const rawW = node.offsetWidth;
        const rawH = node.offsetHeight;
        const raw = typeof node.pinInfo === "function" ? node.pinInfo() : node.pinInfo;
        const hasPins = Array.isArray(raw) && raw.length > 0;
        const diagramAsset = getDiagramAsset(part.catalogId);
        const useDiagramAsset =
          Boolean(diagramAsset) &&
          prefersDiagramAsset(
            part.catalogId,
            Boolean(hasWokwiVisual(getCatalogPart(part.catalogId))),
          );
        if (part.kind === "board" && !hasPins && !useDiagramAsset) {
          boardsReady = false;
        }

        let width = Math.max(rawW, 120);
        let height = Math.max(rawH, 80);
        if (hasPins) {
          const xs = raw.map((pin) => pin.x);
          const ys = raw.map((pin) => pin.y);
          width = Math.max(width, Math.max(...xs) - Math.min(...xs) + 36);
          height = Math.max(height, Math.max(...ys) - Math.min(...ys) + 36);
        } else if (useDiagramAsset && diagramAsset) {
          width = Math.max(width, diagramAsset.width);
          height = Math.max(height, diagramAsset.height);
        } else if (part.kind === "board") {
          width = Math.max(width, 160);
          height = Math.max(height, 220);
        }
        maxRight = Math.max(maxRight, offsetX + width + 140);
        maxBottom = Math.max(maxBottom, offsetY + height + 120);

        const bodyPad = isBreadboardId(part.catalogId) ? 2 : 10;
        const bodyW = isBreadboardId(part.catalogId)
          ? (BB_COLS - 1) * BB_STEP + 12
          : width;
        const bodyH = isBreadboardId(part.catalogId)
          ? BB_ROW_Y.j - BB_ROW_Y.a + 18
          : height;
        const bodyX = isBreadboardId(part.catalogId)
          ? offsetX + BB_ORIGIN_X - 6
          : offsetX - bodyPad;
        const bodyY = isBreadboardId(part.catalogId)
          ? offsetY + BB_ROW_Y.a - 8
          : offsetY - bodyPad;
        obstacles.push({
          x: bodyX,
          y: bodyY,
          w: bodyW + (isBreadboardId(part.catalogId) ? 0 : bodyPad * 2),
          h: bodyH + (isBreadboardId(part.catalogId) ? 0 : bodyPad * 2),
        });

        if (hasPins) {
          const locals = raw.map((pin) => ({ x: pin.x, y: pin.y }));
          for (const pin of raw) {
            const key = `${part.instanceId}:${pin.name}`;
            const global = { x: offsetX + pin.x, y: offsetY + pin.y };
            anchors.set(key, global);
            exitDirs.set(key, pinExitDirection({ x: pin.x, y: pin.y }, locals));
          }
        } else if (isBreadboardId(part.catalogId)) {
          const catalog = getCatalogPart(part.catalogId);
          catalog?.pins.forEach((pin) => {
            const local = breadboardHoleLocal(pin.id);
            if (!local) return;
            const key = `${part.instanceId}:${pin.id}`;
            anchors.set(key, {
              x: offsetX + local.x,
              y: offsetY + local.y,
            });
            exitDirs.set(key, breadboardPinExit(pin.id));
          });
        } else {
          const catalog = getCatalogPart(part.catalogId);
          const terminalLocals = diagramAsset?.terminals
            ? Object.values(diagramAsset.terminals)
            : [];
          catalog?.pins.forEach((pin, index) => {
            const key = `${part.instanceId}:${pin.id}`;
            const named =
              diagramAsset?.terminals?.[pin.id] ||
              diagramAsset?.terminals?.[pin.id.toLowerCase()] ||
              diagramAsset?.terminals?.[pin.id.toUpperCase()];
            if (named) {
              anchors.set(key, {
                x: offsetX + named.x,
                y: offsetY + named.y,
              });
              exitDirs.set(
                key,
                pinExitDirection(named, terminalLocals.length ? terminalLocals : [named]),
              );
              return;
            }
            const onRight = index % 2 !== 0;
            const assetW = diagramAsset?.width ?? width;
            anchors.set(key, {
              x: offsetX + (onRight ? assetW : 0),
              y: offsetY + 28 + Math.floor(index / 2) * 16,
            });
            exitDirs.set(key, onRight ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 });
          });
        }
      }

      if (guide.power_source) {
        if (isBatteryPowerSource(guide.power_source)) {
          const asset = getBatteryAsset(guide.power_source);
          obstacles.push({
            x: POWER_ORIGIN.x,
            y: POWER_ORIGIN.y,
            w: asset.width,
            h: asset.height + 16,
          });
        } else {
          obstacles.push({
            x: POWER_ORIGIN.x,
            y: POWER_ORIGIN.y,
            w: 150,
            h: 110,
          });
        }
      }

      const defaultExit: ExitDir = { dx: 1, dy: 0 };

      const board = placed.find((part) => part.kind === "board");
      if (guide.power_source && board) {
        const powerPins = boardPowerPins(board);
        if (isBatteryPowerSource(guide.power_source)) {
          const wireAnchors = BATTERY_WIRE_ANCHORS[guide.power_source];
          anchors.set("power-source:+", wireAnchors.plus);
          anchors.set("power-source:-", wireAnchors.minus);
          exitDirs.set("power-source:+", wireAnchors.plusExit);
          exitDirs.set("power-source:-", wireAnchors.minusExit);
          if (powerPins.vin) {
            const vinKey = `${board.instanceId}:${powerPins.vin}`;
            const vin =
              anchors.get(vinKey) || {
                x: board.x + 40,
                y: board.y + 24,
              };
            anchors.set("power-source:VIN", vin);
            exitDirs.set(
              "power-source:VIN",
              exitDirs.get(vinKey) ?? defaultExit,
            );
          }
          if (powerPins.gnd) {
            const gndKey = `${board.instanceId}:${powerPins.gnd}`;
            const gnd =
              anchors.get(gndKey) || {
                x: board.x + 40,
                y: board.y + 56,
              };
            anchors.set("power-source:GND", gnd);
            exitDirs.set(
              "power-source:GND",
              exitDirs.get(gndKey) ?? defaultExit,
            );
          }
        } else {
          const outPt = {
            x: POWER_ORIGIN.x + 128,
            y: POWER_ORIGIN.y + 38,
          };
          anchors.set("power-source:OUT", outPt);
          exitDirs.set("power-source:OUT", { dx: 1, dy: 0 });
          const targetPin = powerPins.usb || powerPins.vin;
          const target = targetPin
            ? anchors.get(`${board.instanceId}:${targetPin}`)
            : undefined;
          const boardKey = targetPin
            ? `${board.instanceId}:${targetPin}`
            : "";
          anchors.set(
            "power-source:BOARD",
            target || { x: board.x + 40, y: board.y + 20 },
          );
          if (boardKey) {
            exitDirs.set(
              "power-source:BOARD",
              exitDirs.get(boardKey) ?? defaultExit,
            );
          } else {
            exitDirs.set("power-source:BOARD", defaultExit);
          }
        }
      }

      const nextWires: Wire[] = [];
      const routedPaths: Point[][] = [];
      const routeWire = (
        from: Point,
        to: Point,
        fromKey: string,
        toKey: string,
        index: number,
      ) =>
        routedPath(
          from,
          to,
          exitDirs.get(fromKey) ?? defaultExit,
          exitDirs.get(toKey) ?? { dx: -defaultExit.dx, dy: -defaultExit.dy },
          obstacles,
          index,
          routedPaths,
        );

      guide.connections.forEach((connection, index) => {
        const fromKey = `${connection.from.instanceId}:${connection.from.pinId}`;
        const toKey = `${connection.to.instanceId}:${connection.to.pinId}`;
        const from = anchors.get(fromKey);
        const to = anchors.get(toKey);
        if (!from || !to) return;

        const fromPart = guide.parts.find(
          (part) => part.instanceId === connection.from.instanceId,
        );
        const toPart = guide.parts.find(
          (part) => part.instanceId === connection.to.instanceId,
        );
        const fromName = fromPart
          ? pinLabel(fromPart.catalogId, connection.from.pinId)
          : connection.from.pinId;
        const toName = toPart
          ? pinLabel(toPart.catalogId, connection.to.pinId)
          : connection.to.pinId;
        const label = connection.note || `${fromName} → ${toName}`;
        const fromRail = parseBreadboardRail(connection.from.pinId);
        const toRail = parseBreadboardRail(connection.to.pinId);
        const sameBoardRailBridge =
          fromPart &&
          toPart &&
          fromPart.instanceId === toPart.instanceId &&
          isBreadboardId(fromPart.catalogId) &&
          fromRail &&
          toRail;

        let route: { d: string; mid: Point; points: Point[] };
        if (sameBoardRailBridge && fromRail && toRail) {
          const edgeX =
            from.x + (fromRail.col >= BB_COLS - 2 || toRail.col >= BB_COLS - 2 ? 14 : -14);
          const points: Point[] = [
            from,
            { x: edgeX, y: from.y },
            { x: edgeX, y: to.y },
            to,
          ];
          route = {
            points,
            mid: points[1],
            d: points
              .map((point, i) =>
                i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
              )
              .join(" "),
          };
        } else {
          route = routeWire(from, to, fromKey, toKey, index);
        }
        routedPaths.push(route.points);
        const span = Math.hypot(to.x - from.x, to.y - from.y);
        const touchesBreadboard =
          (fromPart && isBreadboardId(fromPart.catalogId)) ||
          (toPart && isBreadboardId(toPart.catalogId));
        const bothOnOrNearBoard =
          touchesBreadboard &&
          fromPart &&
          toPart &&
          (isBreadboardId(fromPart.catalogId) || fromPart.catalogId.includes("resistor") || fromPart.catalogId.includes(".led.")) &&
          (isBreadboardId(toPart.catalogId) || toPart.catalogId.includes("resistor") || toPart.catalogId.includes(".led."));
        const showLabel =
          (Boolean(connection.note) && !/^Bridge/i.test(connection.note || "")) ||
          (span > 110 && !bothOnOrNearBoard);
        maxRight = Math.max(maxRight, from.x + 40, to.x + 40, route.mid.x + 80);
        maxBottom = Math.max(maxBottom, from.y + 40, to.y + 40, route.mid.y + 40);
        nextWires.push({
          id: connection.id,
          color: wireColor(index, label),
          d: route.d,
          label,
          showLabel,
          mid: route.mid,
          from,
          to,
          points: route.points,
        });
      });

      if (guide.power_source && isBatteryPowerSource(guide.power_source)) {
        const plusFrom = anchors.get("power-source:+");
        const plusTo = anchors.get("power-source:VIN");
        const minusFrom = anchors.get("power-source:-");
        const minusTo = anchors.get("power-source:GND");
        if (plusFrom && plusTo) {
          const route = routeWire(
            plusFrom,
            plusTo,
            "power-source:+",
            "power-source:VIN",
            0,
          );
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-plus",
            color: "#c62828",
            d: route.d,
            label: "+ → VIN",
            showLabel: true,
            mid: route.mid,
            from: plusFrom,
            to: plusTo,
            points: route.points,
          });
        }
        if (minusFrom && minusTo) {
          const route = routeWire(
            minusFrom,
            minusTo,
            "power-source:-",
            "power-source:GND",
            1,
          );
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-minus",
            color: "#212121",
            d: route.d,
            label: "− → GND",
            showLabel: true,
            mid: route.mid,
            from: minusFrom,
            to: minusTo,
            points: route.points,
          });
        }
      } else if (guide.power_source === "usb_wall") {
        const from = anchors.get("power-source:OUT");
        const to = anchors.get("power-source:BOARD");
        if (from && to) {
          const route = routeWire(from, to, "power-source:OUT", "power-source:BOARD", 0);
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-feed",
            color: "#37474f",
            d: route.d,
            label: "USB → VIN",
            showLabel: true,
            mid: route.mid,
            from,
            to,
            points: route.points,
          });
        }
      }

      resolveLabelPositions(nextWires, obstacles);

      for (const wire of nextWires) {
        if (!wire.showLabel) continue;
        const box = labelRect(wire.mid, wire.label);
        maxRight = Math.max(maxRight, box.x + box.w + 24);
        maxBottom = Math.max(maxBottom, box.y + box.h + 24);
      }

      if (!boardsReady && attempts < 25) {
        attempts += 1;
        window.setTimeout(measure, 120);
        return;
      }

      setCanvas({
        width: Math.ceil(maxRight + 160),
        height: Math.ceil(maxBottom + 160),
      });
      setWires(nextWires);

      const viewport = viewportRef.current;
      if (viewport && !fittedRef.current) {
        const nextWidth = Math.ceil(maxRight + 160);
        const nextHeight = Math.ceil(maxBottom + 160);
        const fit = Math.min(
          (viewport.clientWidth - 48) / nextWidth,
          (viewport.clientHeight - 48) / nextHeight,
          1.15,
        );
        fittedRef.current = true;
        setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
        setPan({ x: 40, y: 40 });
      }
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    const timer = window.setTimeout(measure, 160);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [ready, placed, guide.connections, guide.power_source, guide.parts]);

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setZoom(1);
      setPan({ x: 40, y: 40 });
      return;
    }
    const fit = Math.min(
      (viewport.clientWidth - 48) / Math.max(canvas.width, 1),
      (viewport.clientHeight - 48) / Math.max(canvas.height, 1),
      1.15,
    );
    fittedRef.current = true;
    setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
    setPan({ x: 40, y: 40 });
  }, [canvas.height, canvas.width]);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      setFullscreen((value) => !value);
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const delta = event.deltaY > 0 ? -0.12 : 0.12;
        setZoom((current) => clampZoom(current + delta));
        return;
      }
      setPan((current) => ({
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [ready]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setPan({
      x: dragRef.current.panX + dx,
      y: dragRef.current.panY + dy,
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (guide.parts.length === 0) {
    return (
      <div className="diagram-shell px-5 py-8 text-sm text-ink-soft">
        Add parts to render the wiring diagram.
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={`diagram-shell whiteboard-shell bg-[#eef3f0] ${fullscreen ? "is-fullscreen" : ""} ${enlarged ? "is-enlarged" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/90 px-3 py-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-xs font-semibold tracking-tight text-ink">{cue}</p>
          <p className="font-mono text-[11px] text-mute">
            Whiteboard · Zoom {Math.round(zoom * 100)}% · drag / scroll to pan · ctrl/⌘+wheel zoom
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setZoom((value) => clampZoom(value - 0.15))}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={fitToViewport}
            aria-label="Fit diagram"
          >
            Fit
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setZoom((value) => clampZoom(value + 0.15))}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 40 });
              fittedRef.current = true;
            }}
            aria-label="Reset view"
          >
            100%
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => onEnlargedChange?.(!enlarged)}
            aria-label={enlarged ? "Show prep and steps again" : "Expand diagram and hide prep"}
          >
            {enlarged ? "Side" : "Expand"}
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={async () => {
              onEnlargedChange?.(true);
              await toggleFullscreen();
            }}
            aria-label={fullscreen ? "Exit fullscreen whiteboard" : "Open fullscreen whiteboard"}
          >
            {fullscreen ? "Exit" : "Full"}
          </button>
        </div>
      </div>

      {!guide.power_source ? (
        <div className="border-b border-warn-line bg-warn-bg px-3 py-2 text-xs text-warn-ink">
          Power source not set. Ask the user: 9V, 2×AA, 3×AA, 18650, or USB wall?
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className="diagram-viewport cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={hostRef}
          className="diagram-world relative origin-top-left"
          style={{
            width: canvas.width,
            height: canvas.height,
            minWidth: 1200,
            minHeight: 720,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {guide.power_source ? (
            <PowerSourceVisual
              source={guide.power_source}
              x={POWER_ORIGIN.x}
              y={POWER_ORIGIN.y}
            />
          ) : null}

          <svg
            className="pointer-events-none absolute inset-0 z-20"
            width={canvas.width}
            height={canvas.height}
            aria-hidden="true"
          >
            {wires.map((wire) => (
              <g key={wire.id}>
                <path
                  d={wire.d}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth={2.8}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  pathLength={1}
                  className="motion-trace"
                  style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
                />
                <circle cx={wire.from.x} cy={wire.from.y} r={3.2} fill={wire.color} />
                <circle cx={wire.to.x} cy={wire.to.y} r={3.2} fill={wire.color} />
                {wire.showLabel ? (
                  <>
                    <rect
                      x={wire.mid.x - labelSize(wire.label).w / 2}
                      y={wire.mid.y - labelSize(wire.label).h / 2}
                      width={labelSize(wire.label).w}
                      height={labelSize(wire.label).h}
                      rx={3}
                      fill="#f4f7f5"
                      stroke={wire.color}
                      strokeWidth={1}
                      opacity={0.96}
                    />
                    <text
                      x={wire.mid.x}
                      y={wire.mid.y + 3}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fill="#1a242b"
                    >
                      {wire.label}
                    </text>
                  </>
                ) : null}
              </g>
            ))}
          </svg>

          {placed.map((part) => {
            const catalog = getCatalogPart(part.catalogId);
            const breadboard = isBreadboardId(part.catalogId);
            const hasWokwi = Boolean(hasWokwiVisual(catalog) && part.tag);
            const diagramAsset = getDiagramAsset(part.catalogId);
            const useAsset =
              Boolean(diagramAsset) &&
              prefersDiagramAsset(part.catalogId, hasWokwi);
            const useWokwi = ready && hasWokwi && !useAsset;
            return (
              <div
                key={part.instanceId}
                className="absolute z-10"
                style={{ left: part.x, top: part.y }}
              >
                {breadboard ? (
                  <BreadboardVisual instanceId={part.instanceId} name={part.name} />
                ) : useAsset && diagramAsset ? (
                  <BoardAssetVisual
                    instanceId={part.instanceId}
                    name={part.name}
                    asset={diagramAsset}
                  />
                ) : useWokwi ? (
                  createElement(part.tag as string, {
                    ...part.attrs,
                    "data-instance": part.instanceId,
                    style: { display: "inline-block" },
                  })
                ) : (
                  <SkeletonPart
                    instanceId={part.instanceId}
                    name={part.name}
                    catalogId={part.catalogId}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="border-t border-line px-3 py-2 text-[11px] text-mute">
        Freeform wiring whiteboard — drag like Wokwi, Full for immersion. Diagram only, not a
        simulator.
        {guide.power_source
          ? isBatteryPowerSource(guide.power_source)
            ? ` Power: ${getBatteryAsset(guide.power_source).caption}.`
            : " Power: USB wall to USB/VIN."
          : ""}
      </p>
    </div>
  );
}
