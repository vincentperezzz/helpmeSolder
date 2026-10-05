/**
 * Shared contract for the schematic view. Symbols (src/components/schematic/symbols),
 * the net + layout engine (src/lib/schematic) and SchematicDiagram all import from here.
 */
export type Point = { x: number; y: number };

export type PinSide = "left" | "right" | "top" | "bottom";

export type PinKindList = import("@/lib/catalog/types").CatalogPin["kinds"];

/** Drawable primitive. `block` is the generic labeled box for boards and modules. */
export type SymbolKind =
  | "resistor"
  | "led"
  | "potentiometer"
  | "pushbutton"
  | "battery"
  | "usb-supply"
  | "capacitor"
  | "diode"
  | "block";

/** Pin anchor in the symbol's own coordinate space (origin top-left). */
export type SymbolPinSpec = { x: number; y: number; side: PinSide };

export type SymbolSpec = {
  kind: SymbolKind;
  width: number;
  height: number;
  /** Keyed by catalog pin id (e.g. "1", "2", "A", "C", "SIG"). */
  pins: Record<string, SymbolPinSpec>;
};

export type SchematicPin = {
  pinId: string;
  label: string;
  kinds: PinKindList;
  /** Absolute position in the schematic canvas. */
  x: number;
  y: number;
  side: PinSide;
};

export type SchematicPart = {
  instanceId: string;
  catalogId: string;
  name: string;
  symbol: SymbolKind;
  /** Reference designator: R1, D1, SW1, BT1, U1... */
  refDes: string;
  /** Value text under the symbol: "220 ohm", "red"... may be empty. */
  valueText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pins: SchematicPin[];
};

/** Orthogonal polyline for one signal connection (power and ground use rails instead). */
export type SchematicWire = {
  /** Same id as GuideConnection.id so focus/hover state is shared with the picture view. */
  connectionId: string;
  netId: string;
  points: Point[];
};

/** A VCC / GND flag drawn at a pin instead of a long wire. */
export type SchematicRail = {
  id: string;
  netId: string;
  kind: "ground" | "power";
  /** "GND", "3V3", "5V", "VCC". */
  label: string;
  pin: { instanceId: string; pinId: string };
  at: Point;
  /** Where the short stub from the pin meets the flag. */
  stubFrom: Point;
  connectionIds: string[];
};

export type SchematicNet = {
  id: string;
  kind: "ground" | "power" | "signal";
  label: string;
  pins: { instanceId: string; pinId: string }[];
  connectionIds: string[];
};

export type SchematicLayout = {
  width: number;
  height: number;
  parts: SchematicPart[];
  wires: SchematicWire[];
  rails: SchematicRail[];
  nets: SchematicNet[];
  /** Parts left out on purpose (breadboard). */
  skipped: string[];
  /** True when the guide is too large to lay out cleanly; UI shows a fallback notice. */
  tooComplex: boolean;
};
