import { z } from "zod";
import type { PowerSource } from "@/lib/catalog/types";

export const POWER_SOURCE_VALUES = [
  "usb_wall",
  "battery_9v",
  "battery_2aa",
  "battery_3aa",
  "battery_18650",
] as const satisfies readonly PowerSource[];

export function normalizePowerSource(value: string): PowerSource {
  if (value === "battery") return "battery_3aa";
  return value as PowerSource;
}

export const POWER_SOURCE_OPTIONS: { id: PowerSource; label: string }[] = [
  { id: "usb_wall", label: "USB wall adapter" },
  { id: "battery_9v", label: "9V battery" },
  { id: "battery_2aa", label: "2xAA battery pack" },
  { id: "battery_3aa", label: "3xAA battery pack" },
  { id: "battery_18650", label: "18650 Li-ion cell" },
];

const SYNONYMS: Record<string, PowerSource> = {
  usb: "usb_wall",
  usbwall: "usb_wall",
  usbwalladapter: "usb_wall",
  usbadapter: "usb_wall",
  usbcharger: "usb_wall",
  usbpower: "usb_wall",
  wall: "usb_wall",
  walladapter: "usb_wall",
  wallbrick: "usb_wall",
  wallcharger: "usb_wall",
  phonecharger: "usb_wall",
  "9v": "battery_9v",
  "9volt": "battery_9v",
  "9vbattery": "battery_9v",
  "9voltbattery": "battery_9v",
  "9vsnap": "battery_9v",
  "9vpp3": "battery_9v",
  "18650": "battery_18650",
  "18650cell": "battery_18650",
  "18650battery": "battery_18650",
  liion18650: "battery_18650",
  lithium18650: "battery_18650",
};

const COUNT_WORDS: Record<string, string> = { two: "2", three: "3" };

/**
 * Maps what a person or assistant typed to a supported power source, or null.
 * Conservative: only exact supported ids, the generic "battery", and a short
 * list of obvious spellings (9v, 2 x AA, aa x3, li-ion 18650, wall adapter...).
 */
export function matchPowerSource(input: string): PowerSource | null {
  if (typeof input !== "string") return null;
  const lower = input.toLowerCase().trim();
  if ((POWER_SOURCE_VALUES as readonly string[]).includes(lower)) return lower as PowerSource;
  if (lower === "battery") return "battery_3aa";
  const key = lower
    .replace(/\b(two|three)\b/g, (word) => COUNT_WORDS[word])
    .replace(/[^a-z0-9]+/g, "");
  const direct = SYNONYMS[key];
  if (direct) return direct;
  const aa = /^(?:(\d)x?aa|aax(\d))(?:batter(?:y|ies)|pack|cells?|holder)?$/.exec(key);
  const count = aa?.[1] ?? aa?.[2];
  if (count === "2") return "battery_2aa";
  if (count === "3") return "battery_3aa";
  return null;
}

export const powerSourceInputSchema = z
  .enum([...POWER_SOURCE_VALUES, "battery"])
  .transform(normalizePowerSource);

export const powerSourceNullableInputSchema = z
  .enum([...POWER_SOURCE_VALUES, "battery"])
  .nullable()
  .transform((value) => (value === null ? null : normalizePowerSource(value)));

export type BatteryPowerSource = Exclude<PowerSource, "usb_wall">;

export function isBatteryPowerSource(
  source: PowerSource,
): source is BatteryPowerSource {
  return source !== "usb_wall";
}
