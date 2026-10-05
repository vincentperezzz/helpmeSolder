export type PinInfo = { name: string; x: number; y: number };
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
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
};

/** Diagram canvas size, plus the tight content bounds used for "fit". */
export type CanvasSize = {
  width: number;
  height: number;
  fitWidth?: number;
  fitHeight?: number;
};
