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
};

/** Diagram canvas size, plus the tight content bounds used for "fit". */
export type CanvasSize = {
  width: number;
  height: number;
  fitWidth?: number;
  fitHeight?: number;
};
