import { getSymbolKind, getSymbolSpec } from "@/components/schematic/symbols";
import type { CatalogPart, Guide } from "@/lib/catalog/types";
import { buildNetModel, pinKey } from "./nets";
import type {
  PinSide,
  Point,
  SchematicLayout,
  SchematicPart,
  SchematicPin,
  SchematicRail,
  SchematicWire,
  SymbolKind,
  SymbolSpec,
} from "./types";

const MARGIN = 28;
const COL_GAP = 110;
const PASSIVE_GAP = 64;
const ROW_GAP = 30;
const STUB = 14;
const RAIL_STUB = 16;
const LABEL_ROOM = 34;
const LANE_GAP = 8;
const POWER_FLAG_RISE = 26;
const MAX_PARTS = 8;
const MAX_NET_PINS = 8;

const REF_PREFIX: Record<SymbolKind, string> = {
  resistor: "R",
  led: "D",
  diode: "D",
  pushbutton: "SW",
  battery: "BT",
  "usb-supply": "BT",
  potentiometer: "RV",
  capacitor: "C",
  block: "U",
};

const FLIPPABLE: SymbolKind[] = ["resistor", "capacitor"];

function mirrored(spec: SymbolSpec, a: string, b: string): SymbolSpec {
  const pinA = spec.pins[a];
  const pinB = spec.pins[b];
  if (!pinA || !pinB) return spec;
  return { ...spec, pins: { ...spec.pins, [a]: pinB, [b]: pinA } };
}

const SIDE_DIR: Record<PinSide, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

type Placed = {
  instanceId: string;
  catalog: CatalogPart;
  symbol: SymbolKind;
  spec: SymbolSpec;
  refDes: string;
  x: number;
  y: number;
};

type Series = {
  passive: Placed;
  /** Passive pin that faces the target. */
  ownPin: string;
  target: string;
  targetPin: string;
  boardPin: { instanceId: string; pinId: string };
};

function valueTextFor(catalog: CatalogPart, symbol: SymbolKind): string {
  const paren = /\(([^)]+)\)/.exec(catalog.name);
  if (symbol === "led" || symbol === "diode") return paren ? paren[1] : "";
  if (symbol === "resistor") {
    return catalog.name.replace(/^Resistor\s*/i, "").replace(/Ω/g, " ohm").replace(/\s+/g, " ").trim();
  }
  if (symbol === "capacitor") return catalog.name.replace(/^Capacitor\s*/i, "").trim();
  if (symbol === "battery" || symbol === "usb-supply") return catalog.name;
  return "";
}

function isPowerSource(catalogId: string): boolean {
  return catalogId.startsWith("passive.power.");
}

function pinPoint(placed: Placed, pinId: string): (Point & { side: PinSide }) | null {
  const pin = placed.spec.pins[pinId];
  if (!pin) return null;
  return { x: placed.x + pin.x, y: placed.y + pin.y, side: pin.side };
}

function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    out.push(point);
  }
  for (let i = out.length - 2; i > 0; i--) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) out.splice(i, 1);
  }
  return out;
}

function facesAway(pin: Point & { side: PinSide }, other: Point): boolean {
  return (pin.side === "left" && other.x > pin.x) || (pin.side === "right" && other.x < pin.x);
}

function route(
  a: Point & { side: PinSide },
  b: Point & { side: PinSide },
  index: number,
  lane: () => number,
): Point[] {
  const da = SIDE_DIR[a.side];
  const db = SIDE_DIR[b.side];
  const e1 = { x: a.x + da.x * STUB, y: a.y + da.y * STUB };
  const e2 = { x: b.x + db.x * STUB, y: b.y + db.y * STUB };
  const horizontal = (a.side === "left" || a.side === "right") && (b.side === "left" || b.side === "right");
  if (horizontal && (facesAway(a, b) || facesAway(b, a))) {
    const ty = lane();
    return simplify([{ x: a.x, y: a.y }, e1, { x: e1.x, y: ty }, { x: e2.x, y: ty }, e2, { x: b.x, y: b.y }]);
  }
  if (horizontal) {
    const mx = (e1.x + e2.x) / 2 + ((index % 5) - 2) * 4;
    return simplify([{ x: a.x, y: a.y }, e1, { x: mx, y: e1.y }, { x: mx, y: e2.y }, e2, { x: b.x, y: b.y }]);
  }
  return simplify([{ x: a.x, y: a.y }, e1, { x: e2.x, y: e1.y }, e2, { x: b.x, y: b.y }]);
}

/**
 * Lays a guide out as a schematic: power sources left, the board centre, modules and passives right.
 * Series passives (a resistor between a board pin and a target part) sit inline just left of the target.
 * Power and ground nets become rails at each pin. A signal net becomes a tree: the board pin (or the
 * first pin) is the hub and each other pin gets one wire carrying the id of a guide connection that
 * ends on that pin, so a board -> breadboard -> LED chain keeps the LED-side connection id on its
 * wire. Every connection id of the net is also listed on the net and on its rails.
 */
export function layoutSchematic(guide: Guide): SchematicLayout {
  const model = buildNetModel(guide);
  const { nets, catalog, breadboards } = model;

  const skipped = guide.parts
    .filter((part) => breadboards.has(part.instanceId) || !catalog.has(part.instanceId))
    .map((part) => part.instanceId);

  const visible = guide.parts.filter(
    (part) => catalog.has(part.instanceId) && !breadboards.has(part.instanceId),
  );
  const counters = new Map<string, number>();
  const ordered = [...visible].sort(
    (a, b) =>
      Number(catalog.get(b.instanceId)?.kind === "board") -
      Number(catalog.get(a.instanceId)?.kind === "board"),
  );
  const placedById = new Map<string, Placed>();
  for (const part of ordered) {
    const cat = catalog.get(part.instanceId) as CatalogPart;
    const symbol = getSymbolKind(cat.id, cat);
    const prefix = REF_PREFIX[symbol];
    const count = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, count);
    placedById.set(part.instanceId, {
      instanceId: part.instanceId,
      catalog: cat,
      symbol,
      spec: getSymbolSpec(symbol, cat),
      refDes: `${prefix}${count}`,
      x: 0,
      y: 0,
    });
  }
  const all = visible.map((part) => placedById.get(part.instanceId) as Placed);

  const netById = new Map(nets.map((net) => [net.id, net]));
  const hasBoardPin = (netId: string) =>
    (netById.get(netId)?.pins ?? []).some((pin) => placedById.get(pin.instanceId)?.catalog.kind === "board");

  const mainBoard = all.find((placed) => placed.catalog.kind === "board");
  const sources = all.filter((placed) => isPowerSource(placed.catalog.id));

  const candidates = new Map<string, Series>();
  for (const passive of all) {
    if (passive.catalog.kind !== "passive" || isPowerSource(passive.catalog.id)) continue;
    if (!["resistor", "capacitor", "diode"].includes(passive.symbol)) continue;
    if (passive.catalog.pins.length !== 2) continue;
    const [pinA, pinB] = passive.catalog.pins;
    const netA = model.netOfPin(passive.instanceId, pinA.id);
    const netB = model.netOfPin(passive.instanceId, pinB.id);
    if (!netA || !netB || netA === netB) continue;
    if (netById.get(netA)?.kind !== "signal" || netById.get(netB)?.kind !== "signal") continue;
    const boardA = hasBoardPin(netA);
    const boardB = hasBoardPin(netB);
    if (boardA === boardB) continue;
    const [boardNet, otherNet, ownPin] = boardA ? [netA, netB, pinB.id] : [netB, netA, pinA.id];
    const targetRef = (netById.get(otherNet)?.pins ?? []).find(
      (pin) => pin.instanceId !== passive.instanceId && placedById.get(pin.instanceId)?.catalog.kind !== "board",
    );
    const boardRef = (netById.get(boardNet)?.pins ?? []).find(
      (pin) => placedById.get(pin.instanceId)?.catalog.kind === "board",
    );
    if (!targetRef || !boardRef) continue;
    candidates.set(passive.instanceId, {
      passive,
      ownPin,
      target: targetRef.instanceId,
      targetPin: targetRef.pinId,
      boardPin: boardRef,
    });
  }
  const seriesByTarget = new Map<string, Series[]>();
  for (const series of candidates.values()) {
    if (candidates.has(series.target)) continue;
    const { passive } = series;
    const [pinA, pinB] = passive.catalog.pins;
    const boardPinId = series.ownPin === pinA.id ? pinB.id : pinA.id;
    const left = passive.spec.pins[boardPinId];
    const right = passive.spec.pins[series.ownPin];
    if (FLIPPABLE.includes(passive.symbol) && left && right && left.x > right.x) {
      passive.spec = mirrored(passive.spec, pinA.id, pinB.id);
    }
    const list = seriesByTarget.get(series.target) ?? [];
    list.push(series);
    seriesByTarget.set(series.target, list);
  }
  const seriesIds = new Set([...seriesByTarget.values()].flat().map((series) => series.passive.instanceId));

  const targets = all.filter(
    (placed) => placed !== mainBoard && !sources.includes(placed) && !seriesIds.has(placed.instanceId),
  );

  const leftW = Math.max(0, ...sources.map((placed) => placed.spec.width));
  const boardX = sources.length > 0 ? leftW + COL_GAP : 0;
  const boardW = mainBoard ? mainBoard.spec.width : 0;
  const afterBoard = mainBoard ? boardX + boardW + COL_GAP : boardX;
  const passW = Math.max(0, ...[...seriesIds].map((id) => placedById.get(id)?.spec.width ?? 0));
  const passX = afterBoard;
  const targetX = passW > 0 ? passX + passW + PASSIVE_GAP : afterBoard;

  let cursor = 0;
  for (const source of sources) {
    source.x = 0;
    source.y = cursor;
    cursor += source.spec.height + ROW_GAP;
  }
  if (mainBoard) {
    mainBoard.x = boardX;
    mainBoard.y = 0;
  }

  const boardPinY = (ref: { instanceId: string; pinId: string }): number | null => {
    const placed = placedById.get(ref.instanceId);
    const point = placed ? pinPoint(placed, ref.pinId) : null;
    return point ? point.y : null;
  };

  type Anchor = { boardY: number; targetRel: number };
  const anchorOf = (target: Placed): Anchor | null => {
    let best: Anchor | null = null;
    const consider = (boardY: number | null, targetRel: number | undefined) => {
      if (boardY === null || targetRel === undefined) return;
      if (!best || boardY < best.boardY) best = { boardY, targetRel };
    };
    for (const pin of target.catalog.pins) {
      const netId = model.netOfPin(target.instanceId, pin.id);
      const net = netId ? netById.get(netId) : undefined;
      if (!net || net.kind !== "signal") continue;
      const boardRef = net.pins.find((ref) => placedById.get(ref.instanceId)?.catalog.kind === "board");
      if (boardRef) consider(boardPinY(boardRef), target.spec.pins[pin.id]?.y);
    }
    for (const series of seriesByTarget.get(target.instanceId) ?? []) {
      consider(boardPinY(series.boardPin), target.spec.pins[series.targetPin]?.y);
    }
    return best;
  };

  const keyed = targets.map((placed, index) => {
    const anchor = anchorOf(placed);
    return { placed, anchor, key: anchor ? anchor.boardY : Number.POSITIVE_INFINITY, index };
  });
  keyed.sort((a, b) => (a.key === b.key ? a.index - b.index : a.key < b.key ? -1 : 1));

  cursor = 0;
  for (const { placed, anchor } of keyed) {
    placed.x = targetX;
    const stack = [...(seriesByTarget.get(placed.instanceId) ?? [])]
      .map((series) => ({
        series,
        pinY: placed.spec.pins[series.targetPin]?.y ?? placed.spec.height / 2,
      }))
      .sort((a, b) => a.pinY - b.pinY);
    let top = 0;
    let bottom = placed.spec.height;
    let floor = Number.NEGATIVE_INFINITY;
    const rel = new Map<string, number>();
    for (const { series, pinY } of stack) {
      const own = series.passive.spec.pins[series.ownPin]?.y ?? series.passive.spec.height / 2;
      const y = Math.max(pinY - own, floor);
      rel.set(series.passive.instanceId, y);
      floor = y + series.passive.spec.height + 8;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + series.passive.spec.height);
    }
    const desired = anchor ? anchor.boardY - anchor.targetRel + top : cursor;
    const rowTop = Math.max(cursor, desired);
    placed.y = rowTop - top;
    for (const { series } of stack) {
      series.passive.x = passX + (passW - series.passive.spec.width);
      series.passive.y = placed.y + (rel.get(series.passive.instanceId) as number);
    }
    cursor = rowTop + (bottom - top) + ROW_GAP;
  }

  const parts: SchematicPart[] = all.map((placed) => {
    const pins: SchematicPin[] = [];
    for (const pin of placed.catalog.pins) {
      const point = pinPoint(placed, pin.id);
      if (!point) continue;
      pins.push({ pinId: pin.id, label: pin.label, kinds: pin.kinds, x: point.x, y: point.y, side: point.side });
    }
    return {
      instanceId: placed.instanceId,
      catalogId: placed.catalog.id,
      name: placed.catalog.name,
      symbol: placed.symbol,
      refDes: placed.refDes,
      valueText: valueTextFor(placed.catalog, placed.symbol),
      x: placed.x,
      y: placed.y,
      width: placed.spec.width,
      height: placed.spec.height,
      pins,
    };
  });

  const partTop = parts.reduce((min, part) => Math.min(min, part.y), 0);
  const powerTop = nets
    .filter((net) => net.kind === "power")
    .flatMap((net) => net.pins)
    .reduce((min, ref) => {
      const placed = placedById.get(ref.instanceId);
      const point = placed ? pinPoint(placed, ref.pinId) : null;
      if (!point) return min;
      const dir = SIDE_DIR[point.side];
      return Math.min(min, point.y + dir.y * RAIL_STUB - POWER_FLAG_RISE);
    }, Number.POSITIVE_INFINITY);
  const laneBase = Math.min(partTop - LABEL_ROOM, powerTop - LANE_GAP);
  let laneCount = 0;
  const lane = () => laneBase - laneCount++ * LANE_GAP;

  const firstConnection = new Map<string, string>();
  for (const connection of guide.connections) {
    for (const end of [connection.from, connection.to]) {
      const key = pinKey(end.instanceId, end.pinId);
      if (!firstConnection.has(key)) firstConnection.set(key, connection.id);
    }
  }

  const wires: SchematicWire[] = [];
  const rails: SchematicRail[] = [];
  let wireIndex = 0;
  for (const net of nets) {
    const located = net.pins.flatMap((ref) => {
      const placed = placedById.get(ref.instanceId);
      const point = placed ? pinPoint(placed, ref.pinId) : null;
      return point ? [{ ref, point }] : [];
    });
    if (net.kind !== "signal") {
      for (const { ref, point } of located) {
        const dir = SIDE_DIR[point.side];
        rails.push({
          id: `rail-${net.id}-${ref.instanceId}-${ref.pinId}`,
          netId: net.id,
          kind: net.kind,
          label: net.label,
          pin: { instanceId: ref.instanceId, pinId: ref.pinId },
          at: { x: point.x + dir.x * RAIL_STUB, y: point.y + dir.y * RAIL_STUB },
          stubFrom: { x: point.x, y: point.y },
          connectionIds: [...net.connectionIds],
        });
      }
      continue;
    }
    if (located.length < 2) continue;
    const hub =
      located.find((entry) => placedById.get(entry.ref.instanceId)?.catalog.kind === "board") ?? located[0];
    for (const entry of located) {
      if (entry === hub) continue;
      const connectionId =
        firstConnection.get(pinKey(entry.ref.instanceId, entry.ref.pinId)) ?? net.connectionIds[0];
      wires.push({
        connectionId,
        netId: net.id,
        points: route(hub.point, entry.point, wireIndex++, lane),
      });
    }
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const part of parts) {
    xs.push(part.x, part.x + part.width);
    ys.push(part.y, part.y + part.height);
  }
  for (const wire of wires) {
    for (const point of wire.points) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }
  for (const rail of rails) {
    const dx = Math.sign(rail.at.x - rail.stubFrom.x);
    const dy = Math.sign(rail.at.y - rail.stubFrom.y);
    xs.push(rail.at.x + dx * LABEL_ROOM, rail.stubFrom.x);
    ys.push(rail.at.y + dy * LABEL_ROOM, rail.stubFrom.y);
  }
  const minX = xs.length ? Math.min(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxX = xs.length ? Math.max(...xs) : 0;
  const maxY = ys.length ? Math.max(...ys) : 0;
  const shiftX = MARGIN - minX;
  const shiftY = MARGIN - minY;
  const move = (point: Point): Point => ({ x: point.x + shiftX, y: point.y + shiftY });

  const shiftedParts = parts.map((part) => ({
    ...part,
    x: part.x + shiftX,
    y: part.y + shiftY,
    pins: part.pins.map((pin) => ({ ...pin, x: pin.x + shiftX, y: pin.y + shiftY })),
  }));
  const shiftedWires = wires.map((wire) => ({ ...wire, points: wire.points.map(move) }));
  const shiftedRails = rails.map((rail) => ({ ...rail, at: move(rail.at), stubFrom: move(rail.stubFrom) }));

  return {
    width: maxX - minX + MARGIN * 2,
    height: maxY - minY + MARGIN * 2,
    parts: shiftedParts,
    wires: shiftedWires,
    rails: shiftedRails,
    nets,
    skipped,
    tooComplex: all.length > MAX_PARTS || nets.some((net) => net.pins.length > MAX_NET_PINS),
  };
}
