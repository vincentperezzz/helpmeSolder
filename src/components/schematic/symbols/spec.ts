import type { CatalogPart, CatalogPin } from "@/lib/catalog/types";
import type { PinSide, SymbolKind, SymbolPinSpec, SymbolSpec } from "@/lib/schematic/types";

export const BLOCK_PIN_PITCH = 18;
const CHAR_WIDTH = 6;
const MIN_BLOCK_WIDTH = 96;

function fixed(
  kind: SymbolKind,
  width: number,
  height: number,
  pins: Record<string, SymbolPinSpec>,
): SymbolSpec {
  return { kind, width, height, pins };
}

const FIXED_SPECS: Record<Exclude<SymbolKind, "block">, SymbolSpec> = {
  resistor: fixed("resistor", 60, 20, {
    "1": { x: 0, y: 10, side: "left" },
    "2": { x: 60, y: 10, side: "right" },
  }),
  led: fixed("led", 60, 34, {
    A: { x: 0, y: 22, side: "left" },
    C: { x: 60, y: 22, side: "right" },
  }),
  diode: fixed("diode", 60, 24, {
    A: { x: 0, y: 12, side: "left" },
    C: { x: 60, y: 12, side: "right" },
  }),
  capacitor: fixed("capacitor", 60, 28, {
    "1": { x: 0, y: 14, side: "left" },
    "2": { x: 60, y: 14, side: "right" },
  }),
  potentiometer: fixed("potentiometer", 60, 38, {
    GND: { x: 0, y: 28, side: "left" },
    SIG: { x: 30, y: 0, side: "top" },
    VCC: { x: 60, y: 28, side: "right" },
  }),
  pushbutton: fixed("pushbutton", 60, 40, {
    "1.l": { x: 0, y: 10, side: "left" },
    "2.l": { x: 0, y: 30, side: "left" },
    "1.r": { x: 60, y: 10, side: "right" },
    "2.r": { x: 60, y: 30, side: "right" },
  }),
  battery: fixed("battery", 60, 32, {
    "+": { x: 0, y: 16, side: "left" },
    "-": { x: 60, y: 16, side: "right" },
  }),
  "usb-supply": fixed("usb-supply", 40, 64, {
    "5V": { x: 20, y: 0, side: "top" },
    GND: { x: 20, y: 64, side: "bottom" },
  }),
};

const SIGNAL_KINDS: CatalogPin["kinds"] = ["digital", "analog", "i2c", "spi", "uart"];

export function blockPinSide(pin: CatalogPin, signalIndex: number): PinSide {
  if (pin.kinds.includes("ground")) return "bottom";
  const isSignal = pin.kinds.some((kind) => SIGNAL_KINDS.includes(kind));
  if (pin.kinds.includes("power") && !isSignal) return "top";
  return signalIndex % 2 === 0 ? "left" : "right";
}

function maxLabel(pins: CatalogPin[]): number {
  return pins.reduce((max, pin) => Math.max(max, pin.label.length), 0);
}

function blockSpec(pins: CatalogPin[]): SymbolSpec {
  const groups: Record<PinSide, CatalogPin[]> = { left: [], right: [], top: [], bottom: [] };
  let signalIndex = 0;
  for (const pin of pins) {
    const side = blockPinSide(pin, signalIndex);
    if (side === "left" || side === "right") signalIndex += 1;
    groups[side].push(pin);
  }

  const sideWidth = (maxLabel(groups.left) + maxLabel(groups.right)) * CHAR_WIDTH + 32;
  const rowWidth = (row: CatalogPin[]) => row.length * (maxLabel(row) * CHAR_WIDTH + 10);
  const width = Math.ceil(
    Math.max(MIN_BLOCK_WIDTH, sideWidth, rowWidth(groups.top), rowWidth(groups.bottom)),
  );

  const titleY = groups.top.length > 0 ? 34 : 16;
  const firstSideY = titleY + 20;
  const sideCount = Math.max(groups.left.length, groups.right.length);
  const lastSideY = sideCount > 0 ? firstSideY + (sideCount - 1) * BLOCK_PIN_PITCH : titleY;
  const height = lastSideY + 14 + (groups.bottom.length > 0 ? 18 : 0);

  const anchors: Record<string, SymbolPinSpec> = {};
  groups.left.forEach((pin, i) => {
    anchors[pin.id] = { x: 0, y: firstSideY + i * BLOCK_PIN_PITCH, side: "left" };
  });
  groups.right.forEach((pin, i) => {
    anchors[pin.id] = { x: width, y: firstSideY + i * BLOCK_PIN_PITCH, side: "right" };
  });
  groups.top.forEach((pin, i) => {
    anchors[pin.id] = { x: Math.round((width * (i + 1)) / (groups.top.length + 1)), y: 0, side: "top" };
  });
  groups.bottom.forEach((pin, i) => {
    anchors[pin.id] = {
      x: Math.round((width * (i + 1)) / (groups.bottom.length + 1)),
      y: height,
      side: "bottom",
    };
  });

  return { kind: "block", width, height, pins: anchors };
}

export function blockTitleY(spec: SymbolSpec): number {
  const hasTop = Object.values(spec.pins).some((pin) => pin.side === "top");
  return hasTop ? 34 : 16;
}

function supplySpec(base: SymbolSpec, part?: CatalogPart): SymbolSpec {
  const plus = part?.pins.find((pin) => pin.kinds.includes("power"));
  const minus = part?.pins.find((pin) => pin.kinds.includes("ground"));
  if (!plus || !minus) return base;
  return {
    ...base,
    pins: {
      [plus.id]: { x: 20, y: 0, side: "top" },
      [minus.id]: { x: 20, y: base.height, side: "bottom" },
    },
  };
}

export function getSymbolSpec(kind: SymbolKind, part?: CatalogPart): SymbolSpec {
  if (kind === "block") return blockSpec(part?.pins ?? []);
  if (kind === "usb-supply") return supplySpec(FIXED_SPECS[kind], part);
  return FIXED_SPECS[kind];
}
