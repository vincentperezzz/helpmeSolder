"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { getCatalogPart } from "@/lib/catalog";
import type { Guide, PowerSource } from "@/lib/catalog/types";
import {
  type BatteryPowerSource,
  isBatteryPowerSource,
} from "@/lib/guides/power-source";
import { hasWokwiVisual, wokwiAttrs } from "@/lib/catalog/wokwi";

type WokwiDiagramProps = {
  guide: Guide;
};

type PinInfo = { name: string; x: number; y: number };
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

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

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;
const BB_LABEL_H = 18;
const BB_ORIGIN_X = 28;
const BB_STEP = 10;
const BB_ROW_Y: Record<string, number> = {
  a: 40,
  b: 50,
  c: 60,
  d: 70,
  e: 80,
  f: 108,
  g: 118,
  h: 128,
  i: 138,
  j: 148,
};

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

function breadboardHoleLocal(pinId: string): Point | null {
  if (pinId === "+" ) {
    return { x: BB_ORIGIN_X + 2 * BB_STEP, y: BB_LABEL_H + 17 };
  }
  if (pinId === "-") {
    return { x: BB_ORIGIN_X + 8 * BB_STEP, y: BB_LABEL_H + 163 };
  }
  const match = /^([a-j])(\d+)$/i.exec(pinId);
  if (!match) return null;
  const row = match[1].toLowerCase();
  const col = Number(match[2]);
  const rowY = BB_ROW_Y[row];
  if (!rowY || col < 1 || col > 30) return null;
  return {
    x: BB_ORIGIN_X + (col - 1) * BB_STEP,
    y: BB_LABEL_H + rowY,
  };
}

function breadboardCol(pinId: string): number | null {
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
  obstacles: Rect[],
  index: number,
): { d: string; mid: Point } {
  const lane = ((index % 5) - 2) * 16;
  const blockers = blockersForWire(from, to, obstacles);
  const avoid = blockers.map((obs) => ({
    x: obs.x + 8,
    y: obs.y + 8,
    w: Math.max(16, obs.w - 16),
    h: Math.max(16, obs.h - 16),
  }));

  const candidates: Point[][] = [];
  if (blockers.length === 0) {
    const midX = from.x + (to.x - from.x) * 0.5 + lane;
    candidates.push([
      from,
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      to,
    ]);
    const midY = (from.y + to.y) / 2 + lane * 0.4;
    candidates.push([
      from,
      { x: from.x, y: midY },
      { x: to.x, y: midY },
      to,
    ]);
  }

  if (blockers.length > 0) {
    const clearTop =
      Math.min(...blockers.map((obs) => obs.y)) - 36 - Math.abs(lane);
    const clearBot =
      Math.max(...blockers.map((obs) => obs.y + obs.h)) + 36 + Math.abs(lane);
    const clearRight =
      Math.max(...blockers.map((obs) => obs.x + obs.w)) + 32 + Math.abs(lane);
    const clearLeft =
      Math.min(...blockers.map((obs) => obs.x)) - 32 - Math.abs(lane);

    candidates.push([
      from,
      { x: from.x, y: clearTop },
      { x: to.x, y: clearTop },
      to,
    ]);
    candidates.push([
      from,
      { x: from.x, y: clearBot },
      { x: to.x, y: clearBot },
      to,
    ]);
    candidates.push([
      from,
      { x: from.x, y: clearTop },
      { x: clearRight, y: clearTop },
      { x: clearRight, y: to.y },
      to,
    ]);
    candidates.push([
      from,
      { x: from.x, y: clearBot },
      { x: clearRight, y: clearBot },
      { x: clearRight, y: to.y },
      to,
    ]);
    candidates.push([
      from,
      { x: clearLeft, y: from.y },
      { x: clearLeft, y: clearTop },
      { x: to.x, y: clearTop },
      to,
    ]);
    candidates.push([
      from,
      { x: clearLeft, y: from.y },
      { x: clearLeft, y: clearBot },
      { x: to.x, y: clearBot },
      to,
    ]);
    candidates.push([
      from,
      { x: clearRight, y: from.y },
      { x: clearRight, y: to.y },
      to,
    ]);
  }

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const hits = pathCrossesObstacles(candidate, avoid);
    const score = pathLength(candidate) + (hits ? 20000 : 0) + candidate.length * 8;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const d = best
    .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ");
  const mid = best[Math.floor(best.length / 2)];
  return { d, mid };
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

  if (cols.length === 0) {
    part.x = breadboard.x + 48;
    part.y = breadboard.y + BB_LABEL_H + (isLed ? 36 : 70);
    part.seated = true;
    return true;
  }

  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const midCol = (minCol + maxCol) / 2;
  const midX = BB_ORIGIN_X + (midCol - 1) * BB_STEP;

  if (isResistor) {
    part.x = breadboard.x + midX - 28;
    part.y = breadboard.y + BB_LABEL_H + 58;
  } else if (isLed) {
    part.x = breadboard.x + BB_ORIGIN_X + (maxCol - 1) * BB_STEP - 8;
    part.y = breadboard.y + BB_LABEL_H + 30;
  } else {
    part.x = breadboard.x + midX - 16;
    part.y = breadboard.y + BB_LABEL_H + 48;
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

  let boardY = 140;
  boards.forEach((part, index) => {
    part.x = 210;
    part.y = boardY;
    boardY += index === 0 ? 360 : 260;
  });

  const breadboards = passives.filter((part) => isBreadboardId(part.catalogId));
  const otherPassives = passives.filter((part) => !isBreadboardId(part.catalogId));

  let breadboardY = 140;
  breadboards.forEach((part) => {
    part.x = 560;
    part.y = breadboardY;
    breadboardY += 230;
  });

  const primaryBreadboard = breadboards[0];
  let freepassiveY = breadboardY;
  otherPassives.forEach((part) => {
    if (primaryBreadboard && seatPassiveOnBreadboard(part, primaryBreadboard, guide)) {
      return;
    }
    part.x = primaryBreadboard ? 940 : 560;
    part.y = freepassiveY;
    freepassiveY += 110;
  });

  let moduleY = 140;
  modules.forEach((part) => {
    const tall =
      part.tag?.includes("lcd") ||
      part.tag?.includes("ili9341") ||
      part.tag?.includes("ssd1306");
    part.x = passives.length > 0 ? 980 : 640;
    part.y = moduleY;
    moduleY += tall ? 280 : 190;
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
  const cols = 30;
  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];
  const hole = (cx: number, cy: number, key: string) => (
    <circle key={key} cx={cx} cy={cy} r={1.6} fill="#9aa3a8" />
  );

  return (
    <div data-instance={instanceId} className="select-none" style={{ width: 340 }}>
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-ink-soft">
        {name}
      </p>
      <svg viewBox="0 0 340 180" width={340} height={180} aria-label={name}>
        <rect x="0" y="0" width="340" height="180" rx="6" fill="#f7f2e8" stroke="#c2b59a" />
        <rect x="8" y="10" width="324" height="14" fill="#f0d9d5" />
        <rect x="8" y="156" width="324" height="14" fill="#d7e4f0" />
        <text x="14" y="20" fontSize="9" fill="#c62828" fontFamily="monospace">
          +
        </text>
        <text x="14" y="166" fontSize="9" fill="#1565c0" fontFamily="monospace">
          −
        </text>
        {Array.from({ length: cols }, (_, col) => {
          const x = 28 + col * 10;
          return (
            <g key={`rail-${col}`}>
              {hole(x, 17, `p-${col}`)}
              {hole(x, 163, `g-${col}`)}
            </g>
          );
        })}
        {rowsTop.map((row, rowIndex) =>
          Array.from({ length: cols }, (_, col) =>
            hole(28 + col * 10, 40 + rowIndex * 10, `${row}${col}`),
          ),
        )}
        {rowsBot.map((row, rowIndex) =>
          Array.from({ length: cols }, (_, col) =>
            hole(28 + col * 10, 108 + rowIndex * 10, `${row}${col}`),
          ),
        )}
        <line x1="20" y1="90" x2="320" y2="90" stroke="#d7cbb3" strokeWidth="2" />
      </svg>
    </div>
  );
}

const BATTERY_WIRE_ANCHORS: Record<
  BatteryPowerSource,
  { plus: { x: number; y: number }; minus: { x: number; y: number } }
> = {
  battery_9v: { plus: { x: 122, y: 24 }, minus: { x: 52, y: 24 } },
  battery_2aa: { plus: { x: 146, y: 52 }, minus: { x: 34, y: 90 } },
  battery_3aa: { plus: { x: 152, y: 54 }, minus: { x: 64, y: 96 } },
  battery_18650: { plus: { x: 140, y: 46 }, minus: { x: 26, y: 46 } },
};

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
        <svg viewBox="0 0 150 110" width={150} height={110} aria-label="USB wall power">
          <rect x="18" y="8" width="70" height="52" rx="6" fill="#eceff1" stroke="#546e7a" />
          <rect x="28" y="18" width="18" height="10" rx="1" fill="#90a4ae" />
          <rect x="52" y="18" width="18" height="10" rx="1" fill="#90a4ae" />
          <text x="28" y="48" fontSize="9" fill="#37474f" fontFamily="monospace">
            USB WALL
          </text>
          <path d="M88 34 H118" stroke="#212121" strokeWidth="3" />
          <rect x="118" y="26" width="22" height="16" rx="2" fill="#37474f" />
          <circle cx="128" cy="34" r="2.5" fill="#c62828" />
          <text x="18" y="78" fontSize="10" fill="#546e7a" fontFamily="monospace">
            5V USB adapter
          </text>
          <text x="18" y="94" fontSize="9" fill="#78909c" fontFamily="monospace">
            one feed → USB / VIN
          </text>
        </svg>
      </div>
    );
  }

  if (source === "battery_9v") {
    return (
      <div
        data-instance="power-source"
        className="absolute"
        style={{ left: x, top: y, width: 150 }}
      >
        <svg viewBox="0 0 150 118" width={150} height={118} aria-label="9V battery">
          <rect x="36" y="28" width="56" height="72" rx="4" fill="#37474f" stroke="#263238" />
          <rect x="44" y="36" width="40" height="56" rx="2" fill="#455a64" />
          <text x="64" y="72" textAnchor="middle" fontSize="14" fill="#eceff1" fontFamily="monospace">
            9V
          </text>
          <circle cx="48" cy="18" r="5" fill="#212121" stroke="#263238" strokeWidth="1" />
          <text x="38" y="14" fontSize="8" fill="#212121" fontFamily="monospace">−</text>
          <rect x="78" y="12" width="10" height="12" rx="1" fill="#c62828" stroke="#8d6e63" />
          <text x="92" y="20" fontSize="9" fill="#c62828" fontFamily="monospace">+</text>
          <path d="M48 23 V36" stroke="#212121" strokeWidth="2" />
          <path d="M83 24 V28" stroke="#c62828" strokeWidth="2" />
          <text x="18" y="108" fontSize="9" fill="#37474f" fontFamily="monospace">
            9V snap · + → VIN · − → GND
          </text>
        </svg>
      </div>
    );
  }

  if (source === "battery_2aa") {
    return (
      <div
        data-instance="power-source"
        className="absolute"
        style={{ left: x, top: y, width: 150 }}
      >
        <svg viewBox="0 0 150 120" width={150} height={120} aria-label="2xAA battery holder">
          <rect x="20" y="24" width="88" height="44" rx="5" fill="#5d4037" stroke="#3e2723" />
          <rect x="28" y="30" width="30" height="32" rx="14" fill="#ffecb3" stroke="#8d6e63" />
          <rect x="62" y="30" width="30" height="32" rx="14" fill="#ffecb3" stroke="#8d6e63" />
          <path d="M108 38 C118 38 124 44 124 52" stroke="#c62828" strokeWidth="2.5" fill="none" />
          <circle cx="128" cy="52" r="4" fill="#c62828" />
          <text x="134" y="55" fontSize="9" fill="#c62828" fontFamily="monospace">+</text>
          <path d="M108 58 C118 58 124 64 124 72" stroke="#212121" strokeWidth="2.5" fill="none" />
          <circle cx="128" cy="72" r="4" fill="#212121" />
          <text x="134" y="75" fontSize="9" fill="#212121" fontFamily="monospace">−</text>
          <text x="22" y="88" fontSize="10" fill="#5d4037" fontFamily="monospace">2×AA HOLDER</text>
          <text x="22" y="104" fontSize="9" fill="#8d6e63" fontFamily="monospace">
            red + · black −
          </text>
        </svg>
      </div>
    );
  }

  if (source === "battery_18650") {
    return (
      <div
        data-instance="power-source"
        className="absolute"
        style={{ left: x, top: y, width: 150 }}
      >
        <svg viewBox="0 0 150 110" width={150} height={110} aria-label="18650 battery">
          <rect x="24" y="34" width="88" height="28" rx="14" fill="#1565c0" stroke="#0d47a1" />
          <rect x="30" y="40" width="76" height="16" rx="8" fill="#1976d2" />
          <circle cx="118" cy="48" r="5" fill="#c62828" stroke="#8d6e63" strokeWidth="1" />
          <text x="126" y="51" fontSize="9" fill="#c62828" fontFamily="monospace">+</text>
          <circle cx="18" cy="48" r="5" fill="#212121" stroke="#37474f" strokeWidth="1" />
          <text x="8" y="51" fontSize="9" fill="#212121" fontFamily="monospace">−</text>
          <text x="24" y="82" fontSize="10" fill="#0d47a1" fontFamily="monospace">18650 Li-ion</text>
          <text x="24" y="98" fontSize="9" fill="#546e7a" fontFamily="monospace">
            + → VIN · − → GND
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      data-instance="power-source"
      className="absolute"
      style={{ left: x, top: y, width: 150 }}
    >
      <svg viewBox="0 0 150 120" width={150} height={120} aria-label="3xAA battery holder">
        <rect x="16" y="12" width="92" height="48" rx="6" fill="#fff8e1" stroke="#8d6e63" />
        <rect x="24" y="20" width="22" height="32" rx="3" fill="#ffecb3" stroke="#8d6e63" />
        <rect x="50" y="20" width="22" height="32" rx="3" fill="#ffecb3" stroke="#8d6e63" />
        <rect x="76" y="20" width="22" height="32" rx="3" fill="#ffecb3" stroke="#8d6e63" />
        <rect x="108" y="28" width="8" height="16" rx="1" fill="#6d4c41" />
        <circle cx="128" cy="30" r="4" fill="#c62828" stroke="#8d6e63" strokeWidth="1" />
        <text x="134" y="33" fontSize="9" fill="#c62828" fontFamily="monospace">+</text>
        <circle cx="40" cy="72" r="4" fill="#212121" stroke="#8d6e63" strokeWidth="1" />
        <text x="48" y="75" fontSize="9" fill="#212121" fontFamily="monospace">−</text>
        <text x="24" y="96" fontSize="10" fill="#5d4037" fontFamily="monospace">3×AA HOLDER</text>
        <text x="24" y="112" fontSize="9" fill="#8d6e63" fontFamily="monospace">
          + → VIN · − → GND
        </text>
      </svg>
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

export function WokwiDiagram({ guide }: WokwiDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [wires, setWires] = useState<Wire[]>([]);
  const [canvas, setCanvas] = useState({ width: 1100, height: 560 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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
      const obstacles: Rect[] = [];
      let maxRight = 900;
      let maxBottom = 520;
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
        if (part.kind === "board" && !hasPins) {
          boardsReady = false;
        }

        let width = Math.max(rawW, 120);
        let height = Math.max(rawH, 80);
        if (hasPins) {
          const xs = raw.map((pin) => pin.x);
          const ys = raw.map((pin) => pin.y);
          width = Math.max(width, Math.max(...xs) - Math.min(...xs) + 36);
          height = Math.max(height, Math.max(...ys) - Math.min(...ys) + 36);
        } else if (part.kind === "board") {
          width = Math.max(width, 160);
          height = Math.max(height, 220);
        }
        maxRight = Math.max(maxRight, offsetX + width + 140);
        maxBottom = Math.max(maxBottom, offsetY + height + 120);

        if (part.kind === "board" && hasPins) {
          const xs = raw.map((pin) => pin.x);
          const ys = raw.map((pin) => pin.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          obstacles.push({
            x: offsetX + minX - 14,
            y: offsetY + minY - 14,
            w: maxX - minX + 28,
            h: maxY - minY + 28,
          });
        } else if (part.kind === "board") {
          obstacles.push({
            x: offsetX - 10,
            y: offsetY - 10,
            w: width + 20,
            h: height + 20,
          });
        }

        if (hasPins) {
          for (const pin of raw) {
            anchors.set(`${part.instanceId}:${pin.name}`, {
              x: offsetX + pin.x,
              y: offsetY + pin.y,
            });
          }
        } else if (isBreadboardId(part.catalogId)) {
          const catalog = getCatalogPart(part.catalogId);
          catalog?.pins.forEach((pin) => {
            const local = breadboardHoleLocal(pin.id);
            if (!local) return;
            anchors.set(`${part.instanceId}:${pin.id}`, {
              x: offsetX + local.x,
              y: offsetY + local.y,
            });
          });
        } else {
          const catalog = getCatalogPart(part.catalogId);
          catalog?.pins.forEach((pin, index) => {
            anchors.set(`${part.instanceId}:${pin.id}`, {
              x: offsetX + (index % 2 === 0 ? 0 : width),
              y: offsetY + 28 + Math.floor(index / 2) * 16,
            });
          });
        }
      }

      const board = placed.find((part) => part.kind === "board");
      if (guide.power_source && board) {
        const powerPins = boardPowerPins(board);
        if (isBatteryPowerSource(guide.power_source)) {
          const wireAnchors = BATTERY_WIRE_ANCHORS[guide.power_source];
          anchors.set("power-source:+", wireAnchors.plus);
          anchors.set("power-source:-", wireAnchors.minus);
          if (powerPins.vin) {
            const vin =
              anchors.get(`${board.instanceId}:${powerPins.vin}`) || {
                x: board.x + 40,
                y: board.y + 24,
              };
            anchors.set("power-source:VIN", vin);
          }
          if (powerPins.gnd) {
            const gnd =
              anchors.get(`${board.instanceId}:${powerPins.gnd}`) || {
                x: board.x + 40,
                y: board.y + 56,
              };
            anchors.set("power-source:GND", gnd);
          }
        } else {
          anchors.set("power-source:OUT", { x: 140, y: 58 });
          const targetPin = powerPins.usb || powerPins.vin;
          const target = targetPin
            ? anchors.get(`${board.instanceId}:${targetPin}`)
            : undefined;
          anchors.set(
            "power-source:BOARD",
            target || { x: board.x + 40, y: board.y + 20 },
          );
        }
      }

      const nextWires: Wire[] = [];
      guide.connections.forEach((connection, index) => {
        const from = anchors.get(
          `${connection.from.instanceId}:${connection.from.pinId}`,
        );
        const to = anchors.get(
          `${connection.to.instanceId}:${connection.to.pinId}`,
        );
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
        const route = routedPath(from, to, obstacles, index);
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
          Boolean(connection.note) ||
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
        });
      });

      if (guide.power_source && isBatteryPowerSource(guide.power_source)) {
        const plusFrom = anchors.get("power-source:+");
        const plusTo = anchors.get("power-source:VIN");
        const minusFrom = anchors.get("power-source:-");
        const minusTo = anchors.get("power-source:GND");
        if (plusFrom && plusTo) {
          const route = routedPath(plusFrom, plusTo, obstacles, 0);
          nextWires.unshift({
            id: "power-plus",
            color: "#c62828",
            d: route.d,
            label: "+ → VIN",
            showLabel: true,
            mid: route.mid,
            from: plusFrom,
            to: plusTo,
          });
        }
        if (minusFrom && minusTo) {
          const route = routedPath(minusFrom, minusTo, obstacles, 1);
          nextWires.unshift({
            id: "power-minus",
            color: "#212121",
            d: route.d,
            label: "− → GND",
            showLabel: true,
            mid: route.mid,
            from: minusFrom,
            to: minusTo,
          });
        }
      } else if (guide.power_source === "usb_wall") {
        const from = anchors.get("power-source:OUT");
        const to = anchors.get("power-source:BOARD");
        if (from && to) {
          const route = routedPath(from, to, obstacles, 0);
          nextWires.unshift({
            id: "power-feed",
            color: "#37474f",
            d: route.d,
            label: "USB → VIN",
            showLabel: true,
            mid: route.mid,
            from,
            to,
          });
        }
      }

      if (!boardsReady && attempts < 25) {
        attempts += 1;
        window.setTimeout(measure, 120);
        return;
      }

      setCanvas({
        width: Math.ceil(maxRight + 40),
        height: Math.ceil(maxBottom + 40),
      });
      setWires(nextWires);

      const viewport = viewportRef.current;
      if (viewport && !fittedRef.current) {
        const nextWidth = Math.ceil(maxRight + 40);
        const nextHeight = Math.ceil(maxBottom + 40);
        const fit = Math.min(
          (viewport.clientWidth - 24) / nextWidth,
          (viewport.clientHeight - 24) / nextHeight,
          1,
        );
        fittedRef.current = true;
        setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
        setPan({ x: 12, y: 12 });
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

  const clampZoom = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }, []);

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((current) => clampZoom(current + delta));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
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
    <div className="diagram-shell bg-[#f4f7f5]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/80 px-3 py-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-xs font-semibold tracking-tight text-ink">{cue}</p>
          <p className="font-mono text-[11px] text-mute">
            Zoom {Math.round(zoom * 100)}% · drag to pan · ctrl/⌘+wheel zoom
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
            onClick={() => {
              fittedRef.current = false;
              const viewport = viewportRef.current;
              if (!viewport) {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                return;
              }
              const fit = Math.min(
                (viewport.clientWidth - 24) / canvas.width,
                (viewport.clientHeight - 24) / canvas.height,
                1,
              );
              fittedRef.current = true;
              setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
              setPan({ x: 12, y: 12 });
            }}
            aria-label="Reset zoom"
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
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={hostRef}
          className="relative origin-top-left"
          style={{
            width: canvas.width,
            height: canvas.height,
            minHeight: 420,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {guide.power_source ? (
            <PowerSourceVisual source={guide.power_source} x={24} y={24} />
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
                      x={wire.mid.x - Math.min(58, wire.label.length * 3)}
                      y={wire.mid.y - 9}
                      width={Math.min(120, wire.label.length * 5.8 + 10)}
                      height={16}
                      rx={3}
                      fill="#f4f7f5"
                      stroke={wire.color}
                      strokeWidth={1}
                      opacity={0.96}
                    />
                    <text
                      x={wire.mid.x}
                      y={wire.mid.y + 2.5}
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
            const useWokwi = ready && hasWokwiVisual(catalog) && part.tag;
            return (
              <div
                key={part.instanceId}
                className="absolute z-10"
                style={{ left: part.x, top: part.y }}
              >
                {breadboard ? (
                  <BreadboardVisual instanceId={part.instanceId} name={part.name} />
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
        Wokwi visuals (MIT) plus breadboard and power. Diagram only, not a simulator.
        {guide.power_source
          ? isBatteryPowerSource(guide.power_source)
            ? " Power: battery + to VIN, − to GND."
            : " Power: USB wall to USB/VIN."
          : ""}
      </p>
    </div>
  );
}
