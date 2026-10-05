import { describe, expect, it } from "vitest";
import { BATTERY_RECORD_LIST } from "@/lib/catalog/battery-records";
import {
  POWER_OPTIONS,
  POWER_SOURCE_OPTIONS,
  POWER_SOURCE_VALUES,
  isBatteryPowerSource,
  isUsbPowerSource,
  matchPowerSource,
  powerSourceInputSchema,
} from "./power-source";

describe("matchPowerSource", () => {
  it.each([
    ["usb_wall", "usb_wall"],
    ["battery_9v", "battery_9v"],
    ["battery", "battery_3aa"],
    ["9v", "battery_9v"],
    ["9 volt", "battery_9v"],
    ["9V battery", "battery_9v"],
    ["usb", "usb_wall"],
    ["Wall adapter", "usb_wall"],
    ["phone charger", "usb_wall"],
    ["2aa", "battery_2aa"],
    ["2 x AA", "battery_2aa"],
    ["AA x2", "battery_2aa"],
    ["two AA batteries", "battery_2aa"],
    ["3xAA", "battery_3aa"],
    ["18650", "battery_18650"],
    ["Li-ion 18650", "battery_18650"],
    // New sources
    ["4xAA", "battery_4aa"],
    ["6 x AA", "battery_6aa"],
    ["four AA batteries", "battery_4aa"],
    ["1xAA", "battery_1aa"],
    ["3xAAA", "battery_3aaa"],
    ["AAA x2", "battery_2aaa"],
    ["C cell", "battery_1c"],
    ["D cell", "battery_1d"],
    ["2 x D", "battery_2d"],
    ["3xAA NiMH", "battery_3aa_nimh"],
    ["4 AA rechargeable", "battery_4aa_nimh"],
    ["NiMH 4xAAA", "battery_4aaa_nimh"],
    ["2xAA lithium", "battery_2aa_lithium"],
    ["CR2032", "battery_cr2032"],
    ["CR2032 coin cell", "battery_cr2032"],
    ["CR2025", "battery_cr2032"],
    ["coin cell", "battery_cr2032"],
    ["LiPo pouch", "battery_lipo_1s"],
    ["1S LiPo", "battery_lipo_1s"],
    ["2S LiPo", "battery_lipo_2s"],
    ["21700", "battery_21700"],
    ["14500", "battery_14500"],
    ["CR123A", "battery_cr123a"],
    ["12V supply", "supply_barrel_12v"],
    ["9V wall adapter", "supply_barrel_9v"],
    ["power bank", "power_bank"],
  ])("maps %s to %s", (input, expected) => {
    expect(matchPowerSource(input)).toBe(expected);
  });

  it.each([
    "AAA cells",
    "AA",
    "5xAA",
    "3xD",
    "1xAA NiMH",
    "solar panel",
    "car battery",
    "mains power",
    "",
  ])("does not map %s", (input) => {
    expect(matchPowerSource(input)).toBeNull();
  });
});

describe("power source table", () => {
  it("keeps the original ids", () => {
    for (const id of ["usb_wall", "battery_9v", "battery_2aa", "battery_3aa", "battery_18650"]) {
      expect(POWER_SOURCE_VALUES).toContain(id);
    }
  });

  it("has unique ids and part ids", () => {
    expect(new Set(POWER_SOURCE_VALUES).size).toBe(POWER_SOURCE_VALUES.length);
    expect(new Set(BATTERY_RECORD_LIST.map((r) => r.partId)).size).toBe(BATTERY_RECORD_LIST.length);
  });

  it("drives every consumer from one list", () => {
    expect(POWER_OPTIONS.map((o) => o.id)).toEqual(POWER_SOURCE_VALUES);
    expect(POWER_SOURCE_OPTIONS.map((o) => o.id)).toEqual(POWER_SOURCE_VALUES);
    for (const id of POWER_SOURCE_VALUES) expect(powerSourceInputSchema.safeParse(id).success).toBe(true);
    expect(powerSourceInputSchema.safeParse("battery").data).toBe("battery_3aa");
    expect(powerSourceInputSchema.safeParse("solar panel").success).toBe(false);
  });

  it("has sane voltages for every record (min < nominal < max)", () => {
    for (const r of BATTERY_RECORD_LIST) {
      expect(r.min, r.id).toBeLessThan(r.nominal);
      expect(r.nominal, r.id).toBeLessThan(r.max);
      expect(r.name.length, r.id).toBeGreaterThan(3);
      expect(r.description, r.id).toMatch(/\S/);
      expect(r.watchOuts.length, r.id).toBeGreaterThan(0);
      expect(r.variants.some((v) => v.matchesGuide), r.id).toBe(true);
    }
  });

  it("models NiMH at 1.2 V per cell, below the same count of alkaline", () => {
    const get = (id: string) => BATTERY_RECORD_LIST.find((r) => r.id === id)!;
    expect(get("battery_3aa_nimh")).toMatchObject({ nominal: 3.6, min: 3, max: 4.2 });
    expect(get("battery_4aa_nimh")).toMatchObject({ nominal: 4.8, min: 4, max: 5.6 });
    expect(get("battery_3aa").nominal).toBe(4.5);
    expect(get("battery_4aa").nominal).toBe(6);
    expect(get("battery_3aa_nimh").nominal).toBeLessThan(get("battery_3aa").nominal);
    expect(get("battery_3aa_nimh").description).toMatch(/1\.2 V/);
    expect(get("battery_3aa_nimh").watchOuts.join(" ")).toMatch(/3\.6 V, not 4\.5 V/);
  });

  it("models the other chemistries", () => {
    const get = (id: string) => BATTERY_RECORD_LIST.find((r) => r.id === id)!;
    expect(get("battery_2aa_lithium")).toMatchObject({ nominal: 3, max: 3.6 });
    expect(get("battery_cr2032")).toMatchObject({ nominal: 3, min: 2, max: 3.3, lowCurrent: true });
    expect(get("battery_lipo_1s")).toMatchObject({ nominal: 3.7, min: 3, max: 4.2 });
    expect(get("battery_lipo_2s")).toMatchObject({ nominal: 7.4, min: 6, max: 8.4 });
    expect(get("battery_14500").nominal).toBe(3.7);
    expect(get("battery_14500").description).toMatch(/NOT a 1\.5 V AA/);
    expect(get("battery_cr123a")).toMatchObject({ nominal: 3, rechargeable: false });
  });

  it("never names a brand", () => {
    const text = JSON.stringify(BATTERY_RECORD_LIST).toLowerCase();
    for (const brand of ["duracell", "energizer", "eneloop", "panasonic", "varta", "ultimate", "max plus"]) {
      expect(text, brand).not.toContain(brand);
    }
    const alkaline = BATTERY_RECORD_LIST.find((r) => r.id === "battery_4aa")!;
    expect(alkaline.description).toMatch(/brand/i);
  });

  it("tells wired batteries from USB feeds", () => {
    expect(isUsbPowerSource("usb_wall")).toBe(true);
    expect(isUsbPowerSource("power_bank")).toBe(true);
    expect(isBatteryPowerSource("battery_cr2032")).toBe(true);
    expect(isBatteryPowerSource("supply_barrel_9v")).toBe(true);
  });
});
