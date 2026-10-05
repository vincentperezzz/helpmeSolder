export const STUB_BASE = 18;
export const STUB_SPREAD = 4;
export const POWER_ORIGIN = { x: 96, y: 56 };

export const COLORS = [
  "#c62828",
  "#1565c0",
  "#2e7d32",
  "#ef6c00",
  "#6a1b9a",
  "#00838f",
  "#546e7a",
  "#ad1457",
];

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3.2;

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
export const BB_PITCH = 10;
export const BB_COLS = 30;
export const BB_MARGIN_X = 24;
export const BB_WIDTH = BB_MARGIN_X * 2 + (BB_COLS - 1) * BB_PITCH;
export const BB_HEIGHT = 196;
export const BB_ORIGIN_X = BB_MARGIN_X;
export const BB_STEP = BB_PITCH;
export const LABEL_H = 22;
export const LABEL_FONT = 13;
export const LABEL_PAD = 6;
export const BB_RAIL_Y = {
  topPlus: 14,
  topMinus: 24,
  botPlus: 172,
  botMinus: 182,
} as const;
export const BB_ROW_Y: Record<string, number> = {
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
