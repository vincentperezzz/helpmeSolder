import { z } from "zod";
import {
  BATTERY_RECORD_LIST,
  POWER_GROUP_LABELS,
  fmtVolts,
  type BatteryKind,
  type PowerGroup,
} from "@/lib/catalog/battery-records";
import type { PowerSource } from "@/lib/catalog/types";

/** USB sources: a cable into the board's USB port, drawn by the USB visual. */
export const USB_POWER_SOURCES = ["usb_wall", "power_bank"] as const satisfies readonly PowerSource[];
export type UsbPowerSource = (typeof USB_POWER_SOURCES)[number];

/**
 * Every valid power_source id, generated from the battery table. The MCP tool
 * descriptions and zod enums read this, so adding a record updates them all.
 */
export const POWER_SOURCE_VALUES = [
  ...USB_POWER_SOURCES,
  ...BATTERY_RECORD_LIST.map((record) => record.id as BatteryKind),
] as [PowerSource, ...PowerSource[]];

export function normalizePowerSource(value: string): PowerSource {
  if (value === "battery") return "battery_3aa";
  return value as PowerSource;
}

export type PowerOption = {
  id: PowerSource;
  /** Plain short label, e.g. "4 AA batteries". */
  label: string;
  /** Reads "Powered by <fact>". */
  fact: string;
  hint: string;
  group: PowerGroup | "usb";
  groupLabel: string;
  nominal: number;
  min: number;
  max: number;
  ask: { label: string; diagram: string; when: string };
};

const USB_OPTIONS: PowerOption[] = [
  {
    id: "usb_wall",
    label: "USB cable (easiest)",
    fact: "a USB cable",
    hint: "Plug a USB cable from a phone charger into the board. Nothing to solder for power.",
    group: "usb",
    groupLabel: POWER_GROUP_LABELS.usb,
    nominal: 5,
    min: 4.75,
    max: 5.25,
    ask: {
      label: "USB wall adapter",
      diagram: "Shows a USB wall brick into the board USB / 5V rail.",
      when: "Bench, indoor, always-on, or powered from a phone charger brick.",
    },
  },
  {
    id: "power_bank",
    label: "USB power bank",
    fact: "a USB power bank",
    hint: "A phone power bank on a USB cable: portable and nothing to solder for power.",
    group: "usb",
    groupLabel: POWER_GROUP_LABELS.usb,
    nominal: 5,
    min: 4.75,
    max: 5.25,
    ask: {
      label: "USB power bank",
      diagram: "Shows a power bank with a USB cable into the board's USB port.",
      when: "Portable but still easy: any phone power bank works; some switch off with a tiny load.",
    },
  },
];

/** Every choice in display order: USB first, then the battery table. */
export const POWER_OPTIONS: PowerOption[] = [
  ...USB_OPTIONS,
  ...BATTERY_RECORD_LIST.map(
    (record): PowerOption => ({
      id: record.id as PowerSource,
      label: record.choice.label,
      fact: record.choice.fact,
      hint: record.choice.hint,
      group: record.group,
      groupLabel: POWER_GROUP_LABELS[record.group],
      nominal: record.nominal,
      min: record.min,
      max: record.max,
      ask: record.ask,
    }),
  ),
];

export const POWER_SOURCE_OPTIONS: { id: PowerSource; label: string }[] = POWER_OPTIONS.map(
  (option) => ({ id: option.id, label: option.ask.label }),
);

/** "5 V (4.75-5.25 V)" style summary for one option, used in MCP text. */
export function describePowerVoltage(option: Pick<PowerOption, "nominal" | "min" | "max">): string {
  return `${fmtVolts(option.nominal)} V nominal (${fmtVolts(option.min)}-${fmtVolts(option.max)} V)`;
}

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
  powerbank: "power_bank",
  usbpowerbank: "power_bank",
  powerbankusb: "power_bank",
  portablecharger: "power_bank",
  batterybank: "power_bank",
  mobilepowerbank: "power_bank",
  phonepowerbank: "power_bank",
  ...Object.fromEntries(
    BATTERY_RECORD_LIST.flatMap((record) =>
      record.synonyms.map((synonym) => [synonym.replace(/[^a-z0-9]+/g, ""), record.id as PowerSource]),
    ),
  ),
};

const COUNT_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  six: "6",
};

const CHEMISTRY_WORDS: Record<string, string> = {
  alkaline: "",
  nimh: "_nimh",
  rechargeable: "_nimh",
  rechargeables: "_nimh",
  lithium: "_lithium",
  lifes2: "_lithium",
};

/**
 * "4xAA", "AA x4", "3 AAA NiMH", "two rechargeable AA", "2 x D"... -> battery_4aa etc.
 * Only returns an id that exists in the battery table.
 */
function matchCellPack(key: string): PowerSource | null {
  const m =
    /^(?:(alkaline|nimh|rechargeables?|lithium)?(?:(\d)x?(aaa|aa|c|d)|(aaa|aa)x(\d)|(?:(c|d)cell))(alkaline|nimh|rechargeables?|lithium)?(?:batter(?:y|ies)|packs?|cells?|holders?)*)$/.exec(
      key,
    );
  if (!m) return null;
  const chemWord = m[1] ?? m[7] ?? "alkaline";
  const count = m[2] ?? m[5] ?? (m[6] ? "1" : undefined);
  const size = m[3] ?? m[4] ?? m[6];
  if (!count || !size) return null;
  const id = `battery_${count}${size}${CHEMISTRY_WORDS[chemWord] ?? ""}`;
  return (POWER_SOURCE_VALUES as readonly string[]).includes(id) ? (id as PowerSource) : null;
}

/**
 * Maps what a person or assistant typed to a supported power source, or null.
 * Conservative: only exact supported ids, the generic "battery", and a list of
 * obvious spellings (9v, 2 x AA, aa x3, 4xAAA NiMH, CR2032, li-ion 18650, wall adapter...).
 */
export function matchPowerSource(input: string): PowerSource | null {
  if (typeof input !== "string") return null;
  const lower = input.toLowerCase().trim();
  if ((POWER_SOURCE_VALUES as readonly string[]).includes(lower)) return lower as PowerSource;
  if (lower === "battery") return "battery_3aa";
  const key = lower
    .replace(/\b(one|two|three|four|six)\b/g, (word) => COUNT_WORDS[word])
    .replace(/[^a-z0-9]+/g, "");
  const direct = SYNONYMS[key];
  if (direct) return direct;
  return matchCellPack(key);
}

export const powerSourceInputSchema = z
  .enum([...POWER_SOURCE_VALUES, "battery"])
  .transform(normalizePowerSource);

export const powerSourceNullableInputSchema = z
  .enum([...POWER_SOURCE_VALUES, "battery"])
  .nullable()
  .transform((value) => (value === null ? null : normalizePowerSource(value)));

/** Sources drawn as a battery / supply with separate + and - wires. */
export type BatteryPowerSource = BatteryKind;

export function isBatteryPowerSource(source: PowerSource): source is BatteryPowerSource {
  return !(USB_POWER_SOURCES as readonly string[]).includes(source);
}

/** USB-fed sources (wall adapter, power bank): a cable into the board's USB port. */
export function isUsbPowerSource(source: PowerSource): source is UsbPowerSource {
  return !isBatteryPowerSource(source);
}
