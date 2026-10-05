import type { BatteryChemistry } from "./types";

export type BatteryKind =
  | "battery_9v"
  | "battery_2aa"
  | "battery_3aa"
  | "battery_18650";

export type BatteryElectrical = {
  chemistry: BatteryChemistry;
  cells: number;
  nominal: number;
  min: number;
  max: number;
};

/** Pack voltage in volts: nominal, discharged cut-off (min) and fully charged / fresh (max). */
export const BATTERY_ELECTRICAL: Record<BatteryKind, BatteryElectrical> = {
  battery_9v: { chemistry: "alkaline", cells: 6, nominal: 9, min: 6, max: 9.6 },
  battery_2aa: { chemistry: "alkaline", cells: 2, nominal: 3, min: 2, max: 3.2 },
  battery_3aa: { chemistry: "alkaline", cells: 3, nominal: 4.5, min: 3, max: 4.8 },
  battery_18650: { chemistry: "li-ion", cells: 1, nominal: 3.7, min: 3, max: 4.2 },
};

export const USB_WALL_ELECTRICAL = { nominal: 5, min: 4.75, max: 5.25 } as const;

export type BatteryTerminals = {
  plus: { x: number; y: number };
  minus: { x: number; y: number };
  plusExit: { dx: number; dy: number };
  minusExit: { dx: number; dy: number };
};

export type BatteryAsset = {
  id: BatteryKind;
  label: string;
  src: string;
  width: number;
  height: number;
  license: string;
  terminals: BatteryTerminals;
  caption: string;
};

export const BATTERY_ASSETS: Record<BatteryKind, BatteryAsset> = {
  battery_9v: {
    id: "battery_9v",
    label: "9V battery",
    src: "/assets/batteries/battery-9v.svg",
    width: 160,
    height: 150,
    license: "CC0 — HelpmeSolder original SVG",
    terminals: {
      plus: { x: 98, y: 22 },
      minus: { x: 62, y: 22 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: -1 },
    },
    caption: "9V snap — both terminals on top",
  },
  battery_2aa: {
    id: "battery_2aa",
    label: "2×AA cells",
    src: "/assets/batteries/battery-2aa.svg",
    width: 160,
    height: 170,
    license: "CC0 — HelpmeSolder original SVG",
    terminals: {
      plus: { x: 80, y: 18 },
      minus: { x: 80, y: 148 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: 1 },
    },
    caption: "2×AA — + nub on top, − flat on bottom",
  },
  battery_3aa: {
    id: "battery_3aa",
    label: "3×AA cells",
    src: "/assets/batteries/battery-3aa.svg",
    width: 170,
    height: 170,
    license: "CC0 — HelpmeSolder original SVG",
    terminals: {
      plus: { x: 85, y: 16 },
      minus: { x: 85, y: 150 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: 1 },
    },
    caption: "3×AA — + on top, − on bottom",
  },
  battery_18650: {
    id: "battery_18650",
    label: "18650 Li-ion",
    src: "/assets/batteries/battery-18650.svg",
    width: 120,
    height: 180,
    license: "CC0 — HelpmeSolder original SVG",
    terminals: {
      plus: { x: 60, y: 14 },
      minus: { x: 60, y: 166 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: 1 },
    },
    caption: "18650 — + button top, − flat bottom",
  },
};

export function getBatteryAsset(kind: BatteryKind): BatteryAsset {
  return BATTERY_ASSETS[kind];
}
