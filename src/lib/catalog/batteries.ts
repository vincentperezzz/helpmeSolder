import { BATTERY_RECORD_LIST, type BatteryKind, type BatteryRecord } from "./battery-records";
import type { BatteryChemistry } from "./types";

export type { BatteryKind } from "./battery-records";

export type BatteryElectrical = {
  chemistry: BatteryChemistry;
  cells: number;
  nominal: number;
  min: number;
  max: number;
};

/** Pack voltage in volts: nominal, discharged cut-off (min) and fully charged / fresh (max). */
export const BATTERY_ELECTRICAL = Object.fromEntries(
  BATTERY_RECORD_LIST.map((record) => [
    record.id,
    {
      chemistry: record.chemistry,
      cells: record.cells,
      nominal: record.nominal,
      min: record.min,
      max: record.max,
    },
  ]),
) as Record<BatteryKind, BatteryElectrical>;

export const USB_WALL_ELECTRICAL = { nominal: 5, min: 4.75, max: 5.25 } as const;

/** A power bank is a regulated 5 V USB source like the wall adapter. */
export const POWER_BANK_ELECTRICAL = { nominal: 5, min: 4.75, max: 5.25 } as const;

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
  /** "inline": BatteryAssets.tsx draws it by hand. "image": the SVG file is shown as an image. */
  drawn: BatteryRecord["drawn"];
  terminals: BatteryTerminals;
  caption: string;
};

const LICENSE = "CC0 — HelpmeSolder original SVG";

export const BATTERY_ASSETS = Object.fromEntries(
  BATTERY_RECORD_LIST.map((record) => [
    record.id,
    {
      id: record.id,
      label: record.label,
      src: record.asset,
      width: record.width,
      height: record.height,
      license: LICENSE,
      drawn: record.drawn,
      terminals: record.terminals,
      caption: record.caption,
    },
  ]),
) as Record<BatteryKind, BatteryAsset>;

export function getBatteryAsset(kind: BatteryKind): BatteryAsset {
  return BATTERY_ASSETS[kind];
}

const RECORD_BY_ID = new Map<string, BatteryRecord>(BATTERY_RECORD_LIST.map((r) => [r.id, r]));
const RECORD_BY_PART_ID = new Map<string, BatteryRecord>(BATTERY_RECORD_LIST.map((r) => [r.partId, r]));

export function getBatteryRecord(kind: string): BatteryRecord | undefined {
  return RECORD_BY_ID.get(kind);
}

/** The battery record behind a catalog part id (passive.power.battery.4aa...), if any. */
export function batteryRecordForPart(partId: string): BatteryRecord | undefined {
  return RECORD_BY_PART_ID.get(partId);
}

export function isBatteryKind(value: string): value is BatteryKind {
  return RECORD_BY_ID.has(value);
}

/** Chemistries where a short circuit or reverse connection can start a fire. */
export function isLithiumChemistry(chemistry: BatteryChemistry | undefined): boolean {
  return (
    chemistry === "li-ion" ||
    chemistry === "lipo" ||
    chemistry === "lithium" ||
    chemistry === "coin-lithium"
  );
}

/** Rechargeable lithium cells that swing 3.0-4.2 V per cell. */
export function isRechargeableLithium(chemistry: BatteryChemistry | undefined): boolean {
  return chemistry === "li-ion" || chemistry === "lipo";
}
