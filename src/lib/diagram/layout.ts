import type { CatalogPart, CatalogPin, Guide, GuidePart } from "@/lib/catalog/types";
import { getCatalogPart } from "@/lib/catalog";

export type Point = { x: number; y: number };

export type LaidPin = {
  pinId: string;
  label: string;
  kinds: CatalogPin["kinds"];
  x: number;
  y: number;
  side: "left" | "right" | "top" | "bottom";
};

export type LaidPart = {
  instanceId: string;
  catalogId: string;
  name: string;
  kind: CatalogPart["kind"];
  photoHint?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pins: LaidPin[];
};

export type LaidConnection = {
  id: string;
  from: Point;
  to: Point;
  note?: string;
  color: string;
};

export type DiagramLayout = {
  width: number;
  height: number;
  parts: LaidPart[];
  connections: LaidConnection[];
};

const PIN_GAP = 18;
const PAD = 12;

function splitPins(pins: CatalogPin[]): { left: CatalogPin[]; right: CatalogPin[] } {
  const powerish = pins.filter((p) => p.kinds.includes("power") || p.kinds.includes("ground"));
  const rest = pins.filter((p) => !p.kinds.includes("power") && !p.kinds.includes("ground"));
  const left = [...powerish];
  const right = [...rest];
  if (right.length === 0 && left.length > 1) {
    const mid = Math.ceil(left.length / 2);
    return { left: left.slice(0, mid), right: left.slice(mid) };
  }
  if (left.length === 0 && right.length > 0) {
    const mid = Math.ceil(right.length / 2);
    return { left: right.slice(0, mid), right: right.slice(mid) };
  }
  return { left, right };
}

function layoutSkeleton(
  part: GuidePart,
  catalog: CatalogPart,
  originX: number,
  originY: number,
): LaidPart {
  const isBoard = catalog.kind === "board";
  const { left, right } = splitPins(catalog.pins);
  const rows = Math.max(left.length, right.length, 1);
  const width = isBoard ? 168 : 132;
  const height = Math.max(72, rows * PIN_GAP + PAD * 2);
  const pins: LaidPin[] = [];

  left.forEach((pin, index) => {
    pins.push({
      pinId: pin.id,
      label: pin.label,
      kinds: pin.kinds,
      x: originX,
      y: originY + PAD + PIN_GAP / 2 + index * PIN_GAP,
      side: "left",
    });
  });

  right.forEach((pin, index) => {
    pins.push({
      pinId: pin.id,
      label: pin.label,
      kinds: pin.kinds,
      x: originX + width,
      y: originY + PAD + PIN_GAP / 2 + index * PIN_GAP,
      side: "right",
    });
  });

  return {
    instanceId: part.instanceId,
    catalogId: catalog.id,
    name: part.label || catalog.name,
    kind: catalog.kind,
    photoHint: catalog.photoHint,
    x: originX,
    y: originY,
    width,
    height,
    pins,
  };
}

function wireColor(index: number): string {
  const palette = ["#b65c2e", "#1f5a56", "#8f4520", "#2c3a42", "#4f5f67"];
  return palette[index % palette.length];
}

export function layoutGuideDiagram(guide: Guide): DiagramLayout {
  const boardParts: GuidePart[] = [];
  const moduleParts: GuidePart[] = [];

  for (const part of guide.parts) {
    const catalog = getCatalogPart(part.catalogId);
    if (!catalog) continue;
    if (catalog.kind === "board") boardParts.push(part);
    else moduleParts.push(part);
  }

  const laid: LaidPart[] = [];
  let cursorY = 24;
  const boardX = 48;

  for (const part of boardParts) {
    const catalog = getCatalogPart(part.catalogId)!;
    const laidPart = layoutSkeleton(part, catalog, boardX, cursorY);
    laid.push(laidPart);
    cursorY += laidPart.height + 36;
  }

  let moduleY = 24;
  const moduleX = 320;
  for (const part of moduleParts) {
    const catalog = getCatalogPart(part.catalogId)!;
    const laidPart = layoutSkeleton(part, catalog, moduleX, moduleY);
    laid.push(laidPart);
    moduleY += laidPart.height + 28;
  }

  const byInstance = new Map(laid.map((p) => [p.instanceId, p]));
  const connections: LaidConnection[] = [];

  guide.connections.forEach((connection, index) => {
    const fromPart = byInstance.get(connection.from.instanceId);
    const toPart = byInstance.get(connection.to.instanceId);
    const fromPin = fromPart?.pins.find((p) => p.pinId === connection.from.pinId);
    const toPin = toPart?.pins.find((p) => p.pinId === connection.to.pinId);
    if (!fromPin || !toPin) return;
    connections.push({
      id: connection.id,
      from: { x: fromPin.x, y: fromPin.y },
      to: { x: toPin.x, y: toPin.y },
      note: connection.note,
      color: wireColor(index),
    });
  });

  const maxRight = Math.max(...laid.map((p) => p.x + p.width), moduleX + 132, 400);
  const maxBottom = Math.max(...laid.map((p) => p.y + p.height), cursorY, moduleY, 200);

  return {
    width: maxRight + 48,
    height: maxBottom + 32,
    parts: laid,
    connections,
  };
}

export function wirePath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}
