export type PinInfo = { name: string; x: number; y: number };
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
/** A part drawing that plugs into breadboard holes, turned 0/90/180 degrees about its top-left corner. */
export type PlugSpec = {
  w: number;
  h: number;
  rotate: 0 | 90 | 180;
  pins: Record<string, Point>;
};

export type ExitDir = { dx: number; dy: number };

export type PlacedPart = {
  instanceId: string;
  catalogId: string;
  tag?: string;
  attrs: Record<string, string>;
  x: number;
  y: number;
  name: string;
  kind: "board" | "module" | "passive" | "power";
  seated?: boolean;
  /** Set when the part is plugged into breadboard holes: its pins are turned by this spec. */
  plug?: PlugSpec;
  /** CSS transform that turns a plugged part (origin top-left). */
  transform?: string;
};

export type UsbConnectorKind = "usb-a" | "usb-c" | "micro-usb" | "mini-usb" | "usb-b";

/** A cable plug drawn at the end of a USB cable: `tip` goes into the port, `back` is where the cable joins. */
export type UsbPlug = { tip: Point; back: Point; kind: UsbConnectorKind };

export type Wire = {
  id: string;
  color: string;
  d: string;
  label: string;
  showLabel: boolean;
  mid: Point;
  from: Point;
  to: Point;
  points: Point[];
  /** Plain-words description for tooltips when the guide has no checklist item for this wire (power wires). */
  title?: string;
  /** Drawn as a thick grey USB cable with a plug at each end instead of a hookup wire. */
  plugs?: UsbPlug[];
  /** Position in the written "What to solder where" checklist (1-based). Power wires have none. */
  number?: number;
  /** Centre of this wire's numbered badge, on the wire near the part end. */
  badge?: Point;
};

/**
 * Diagram canvas size, plus the tight content box used for "fit". Everything is
 * drawn inside a layer shifted by (offsetX, offsetY), so content never starts
 * left of or above the safe margin. fitLeft/fitTop/fitWidth/fitHeight are in
 * canvas pixels (after the shift).
 */
export type CanvasSize = {
  width: number;
  height: number;
  fitWidth?: number;
  fitHeight?: number;
  fitLeft?: number;
  fitTop?: number;
  /** Shift applied to the drawing layer (layout space to canvas space). */
  offsetX?: number;
  offsetY?: number;
};

/** Tight box around everything drawn, in layout coordinates (may be negative). */
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** What the measure pass produced: final wires and the boxes the label placer must avoid. */
export type DiagramScene = {
  wires: Wire[];
  /** Body boxes of every drawn part (breadboard names, battery caption and so on included). */
  partRects: Rect[];
  bounds: Bounds | null;
};
