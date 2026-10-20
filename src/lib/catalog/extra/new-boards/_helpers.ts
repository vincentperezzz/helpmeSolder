import type { CatalogPart, CatalogPin, PartElectrical, PinElectrical, PinKind } from "../../types";

/**
 * Shared helpers for the new-boards group files in this folder. Same shapes and presets as
 * ../boards.ts: copy a group file's structure from an entry there (description, identify,
 * variants, watchOuts, photoHint, pins) and give every board an `electrical` block.
 */
export type { CatalogPart, CatalogPin, PartElectrical, PinElectrical, PinKind };

/** What one group file exports; src/lib/catalog/extra/new-boards.ts merges them. */
export type NewBoardsGroup = {
  parts: CatalogPart[];
  /** photoHint -> thumbnail url. Use the diagram drawing: "/assets/boards/<slug>.svg". */
  media: Record<string, string>;
  /** part id -> outside-photo search phrases (see ../boards-queries.ts). */
  queries: Record<string, import("../../types").PhotoQueriesOverride>;
};

export function pin(id: string, label: string, kinds: PinKind[], voltage?: "3v3" | "5v"): CatalogPin {
  return voltage ? { id, label, kinds, voltage } : { id, label, kinds };
}
export const power = (id: string, label: string, voltage?: "3v3" | "5v") => pin(id, label, ["power"], voltage);
export const gnd = (id: string, label = "GND") => pin(id, label, ["ground"]);
export const dig = (id: string, label = id) => pin(id, label, ["digital"]);
export const ana = (id: string, label = id) => pin(id, label, ["analog", "digital"]);
export const i2c = (id: string, label = id) => pin(id, label, ["digital", "i2c"]);
export const spi = (id: string, label = id) => pin(id, label, ["digital", "spi"]);
export const uart = (id: string, label = id) => pin(id, label, ["digital", "uart"]);

/** Digital pins D<from>..D<to> on an Arduino-style board. */
export function digRange(from: number, to: number): CatalogPin[] {
  const out: CatalogPin[] = [];
  for (let n = from; n <= to; n++) out.push(dig(`D${n}`));
  return out;
}

export const out3v3: PinElectrical = {
  source: { nominal: 3.3, min: 3.15, max: 3.45 },
  accepts: { min: 3.0, max: 3.6 },
};
export const out5v: PinElectrical = {
  source: { nominal: 5, min: 4.5, max: 5.25 },
  accepts: { min: 4.5, max: 5.5 },
};
/** An input that tolerates a range (VIN / RAW style pins). */
export const vinRange = (min: number, max: number, nominal = max < 9 ? max : 7): PinElectrical => ({
  source: { nominal, min, max },
  accepts: { min, max },
});
/** A 5 V pin fed from USB (5V / VBUS on dev boards). */
export const USB_5V: PinElectrical = {
  source: { nominal: 5, min: 4.5, max: 5.25 },
  accepts: { min: 4.5, max: 5.5 },
};

/** 5 V-logic Arduino with 5V, 3V3 and VIN pins. */
export const ARDUINO_5V: PartElectrical = {
  logic: "5v",
  fiveVTolerantIo: true,
  pins: {
    "5V": out5v,
    "3V3": { source: { nominal: 3.3, min: 3.2, max: 3.4 } },
    VIN: vinRange(7, 12),
  },
};
/** 3.3 V board with one 3V3 pin (id 3V3). */
export const BOARD_3V3 = (extra: Record<string, PinElectrical> = {}): PartElectrical => ({
  logic: "3v3",
  fiveVTolerantIo: false,
  pins: { "3V3": out3v3, ...extra },
});
/** 3.3 V board with two 3V3 pins (ids 3V3.1 and 3V3.2). */
export const BOARD_TWO_3V3 = (extra: Record<string, PinElectrical> = {}): PartElectrical => ({
  logic: "3v3",
  fiveVTolerantIo: false,
  pins: { "3V3.1": out3v3, "3V3.2": out3v3, ...extra },
});
