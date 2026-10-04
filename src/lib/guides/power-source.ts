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
