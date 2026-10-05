import { getCatalogPart } from "@/lib/catalog";
import { BB_ROW_Y, BB_STEP } from "./constants";
import type { PlugSpec, Point } from "./types";

/**
 * Pin positions of the Wokwi part drawings that can be plugged straight into
 * breadboard holes. Pins are in the part's own pixels; `w`/`h` are the measured size of the drawing: the box the
 * part is turned inside (the true drawing fits in it). Parts whose pins sit on
 * the bottom edge are turned 180 degrees so the body hangs below the pins and
 * the holes above them stay free for jumpers.
 */
const SPECS: Record<string, PlugSpec> = {
  "wokwi-buzzer": {
    w: 75,
    h: 84,
    rotate: 180,
    pins: { "1": { x: 27, y: 84 }, "2": { x: 37, y: 84 } },
  },
  "wokwi-led": {
    w: 40,
    h: 60,
    rotate: 180,
    pins: { A: { x: 25, y: 42 }, C: { x: 15, y: 42 } },
  },
  "wokwi-resistor": {
    w: 59,
    h: 24,
    rotate: 0,
    pins: { "1": { x: 0, y: 5.65 }, "2": { x: 58.8, y: 5.65 } },
  },
  "wokwi-pushbutton": {
    w: 67,
    h: 52,
    rotate: 90,
    pins: {
      "1.l": { x: 0, y: 13 },
      "2.l": { x: 0, y: 32 },
      "1.r": { x: 67, y: 13 },
      "2.r": { x: 67, y: 32 },
    },
  },
  "wokwi-dht22": {
    w: 57,
    h: 124,
    rotate: 180,
    pins: {
      VCC: { x: 15, y: 114.9 },
      SDA: { x: 24.5, y: 114.9 },
      NC: { x: 34.1, y: 114.9 },
      GND: { x: 43.8, y: 114.9 },
    },
  },
  "wokwi-hc-sr04": {
    w: 170,
    h: 101,
    rotate: 180,
    pins: {
      VCC: { x: 71.3, y: 94.5 },
      TRIG: { x: 81.3, y: 94.5 },
      ECHO: { x: 91.3, y: 94.5 },
      GND: { x: 101.3, y: 94.5 },
    },
  },
  "wokwi-mpu6050": {
    w: 82,
    h: 68,
    rotate: 0,
    pins: {
      INT: { x: 7.28, y: 5.78 },
      AD0: { x: 16.9, y: 5.78 },
      XCL: { x: 26.4, y: 5.78 },
      XDA: { x: 36, y: 5.78 },
      SDA: { x: 45.6, y: 5.78 },
      SCL: { x: 55.2, y: 5.78 },
      GND: { x: 64.8, y: 5.78 },
      VCC: { x: 74.4, y: 5.78 },
    },
  },
};

/** Pin spacing slack: a drawing pin may sit this far from the hole it is plugged into. */
const HOLE_TOLERANCE = 4.5;

export function plugSpecFor(catalogId: string): PlugSpec | undefined {
  const tag = getCatalogPart(catalogId)?.wokwi?.tag;
  return tag ? SPECS[tag] : undefined;
}

/** A point of the part's own drawing as it appears once the part is turned. */
export function rotatePoint(spec: PlugSpec, p: Point): Point {
  if (spec.rotate === 180) return { x: spec.w - p.x, y: spec.h - p.y };
  if (spec.rotate === 90) return { x: spec.h - p.y, y: p.x };
  return { x: p.x, y: p.y };
}

/** Size of the turned part's box. */
export function rotatedBox(spec: PlugSpec): { w: number; h: number } {
  return spec.rotate === 90 ? { w: spec.h, h: spec.w } : { w: spec.w, h: spec.h };
}

/** CSS (with transform-origin 0 0) that turns the part about its own top-left corner. */
export function plugTransform(spec: PlugSpec): string | undefined {
  if (spec.rotate === 180) return `translate(${spec.w}px, ${spec.h}px) rotate(180deg)`;
  if (spec.rotate === 90) return `translate(${spec.h}px, 0px) rotate(90deg)`;
  return undefined;
}

export type PlugPlan = {
  /** Where each used pin goes, relative to the first used pin's column. */
  slots: Array<{ pinId: string; dcol: number; row: string }>;
  /** Columns the body covers, relative to the first used pin's column. */
  bodyLo: number;
  bodyHi: number;
};

/**
 * Work out which holes a part's used pins fall in when the first used pin sits
 * in row e. Null when the pins do not line up with the 0.1" hole grid.
 */
export function planPlug(catalogId: string, usedPins: string[]): PlugPlan | null {
  const spec = plugSpecFor(catalogId);
  if (!spec || usedPins.length === 0) return null;
  const rotated = new Map<string, Point>();
  for (const pinId of usedPins) {
    const raw = spec.pins[pinId];
    if (!raw) return null;
    rotated.set(pinId, rotatePoint(spec, raw));
  }
  const ref = rotated.get(usedPins[0]) as Point;
  const slots: PlugPlan["slots"] = [];
  const taken = new Set<string>();
  for (const pinId of usedPins) {
    const p = rotated.get(pinId) as Point;
    const dcol = Math.round((p.x - ref.x) / BB_STEP);
    if (Math.abs(p.x - ref.x - dcol * BB_STEP) > HOLE_TOLERANCE) return null;
    const targetY = BB_ROW_Y.e + (p.y - ref.y);
    let row: string | null = null;
    for (const [name, y] of Object.entries(BB_ROW_Y)) {
      if (Math.abs(y - targetY) <= HOLE_TOLERANCE) row = name;
    }
    if (!row) return null;
    const key = `${dcol}${row}`;
    if (taken.has(key)) return null;
    taken.add(key);
    slots.push({ pinId, dcol, row });
  }
  const box = rotatedBox(spec);
  return {
    slots,
    bodyLo: Math.floor((0 - ref.x) / BB_STEP),
    bodyHi: Math.ceil((box.w - ref.x) / BB_STEP),
  };
}
