import { describe, expect, it } from "vitest";
import { matchPowerSource } from "./power-source";

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
  ])("maps %s to %s", (input, expected) => {
    expect(matchPowerSource(input)).toBe(expected);
  });

  it.each(["CR2032 coin cell", "LiPo pouch", "AAA cells", "4xAA", "12V supply", "solar panel"])(
    "does not map %s",
    (input) => {
      expect(matchPowerSource(input)).toBeNull();
    },
  );
});
