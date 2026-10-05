import { describe, expect, it } from "vitest";
import type { Guide, PowerSource } from "@/lib/catalog/types";
import { validateGuide } from "./validator";

const ESP = "board.esp32.devkit";
const UNO = "board.arduino.uno";
const PICO = "board.pico.rp2040";

type Ref = string; // "instance.pinId"
function split(ref: Ref) {
  const i = ref.indexOf(".");
  return { instanceId: ref.slice(0, i), pinId: ref.slice(i + 1) };
}

function guide(
  board: string,
  power: PowerSource | null,
  parts: [string, string][],
  conns: [Ref, Ref][],
): Guide {
  return {
    id: "g",
    title: "t",
    power_source: power,
    board_id: board,
    parts: parts.map(([instanceId, catalogId]) => ({ instanceId, catalogId })),
    connections: conns.map(([a, b], n) => ({ id: `c${n}`, from: split(a), to: split(b) })),
    steps: [],
    notes: [],
    created_at: "",
    updated_at: "",
  };
}

const codes = (g: Guide) => validateGuide(g).issues.map((i) => i.code);

// These rules currently emit alternatives: [] (see validator.ts); tracked as a finding.
const NO_ALTS = { alternatives: false };

function expectError(g: Guide, code: string, opts: { alternatives?: boolean } = { alternatives: true }) {
  const r = validateGuide(g);
  const issue = r.issues.find((i) => i.code === code);
  expect(issue, `expected ${code}, got ${r.issues.map((i) => i.code)}`).toBeDefined();
  expect(issue!.severity ?? "error").toBe("error");
  if (opts.alternatives) expect(issue!.alternatives.length).toBeGreaterThan(0);
  expect(r.ok).toBe(false);
}

function expectWarning(g: Guide, code: string) {
  const r = validateGuide(g);
  const issue = r.issues.find((i) => i.code === code);
  expect(issue, `expected ${code}, got ${r.issues.map((i) => i.code)}`).toBeDefined();
  expect(issue!.severity).toBe("warning");
  const errors = r.issues.filter((i) => (i.severity ?? "error") === "error");
  expect(errors).toEqual([]);
  expect(r.ok).toBe(true);
}

describe("validateGuide: basic checks", () => {
  it("flags missing power source", () => {
    const g = guide(UNO, null, [["b", UNO]], []);
    const r = validateGuide(g);
    expect(r.needsPowerSource).toBe(true);
    expect(r.ok).toBe(false);
    expect(codes(g)).toContain("power_source_required");
  });

  it("flags unknown part", () => {
    const g = guide(UNO, "usb_wall", [["b", UNO], ["x", "module.nope"]], []);
    expect(codes(g)).toContain("unknown_part");
    expect(validateGuide(g).ok).toBe(false);
  });

  it("flags unknown pin and unknown instance", () => {
    const g1 = guide(UNO, "usb_wall", [["b", UNO]], [["b.NOPE", "b.GND.1"]]);
    expect(codes(g1)).toContain("unknown_pin");
    const g2 = guide(UNO, "usb_wall", [["b", UNO]], [["zz.5V", "b.GND.1"]]);
    expect(codes(g2)).toContain("unknown_instance");
  });

  it("flags power directly to ground", () => {
    const g = guide(UNO, "usb_wall", [["b", UNO]], [["b.5V", "b.GND.1"]]);
    expect(codes(g)).toContain("power_to_ground");
  });

  it("accepts a clean guide", () => {
    const g = guide(
      UNO,
      "usb_wall",
      [["b", UNO], ["s", "module.hc-sr04"]],
      [["s.VCC", "b.5V"], ["s.GND", "b.GND.1"], ["s.TRIG", "b.3"], ["s.ECHO", "b.2"]],
    );
    const r = validateGuide(g);
    expect(r.ok).toBe(true);
    expect(r.needsPowerSource).toBe(false);
  });
});

describe("validateGuide: electrical rules", () => {
  it("logic_level_5v_into_3v3_gpio", () => {
    const bad = guide(
      ESP,
      "usb_wall",
      [["b", ESP], ["s", "module.hc-sr04"]],
      [["s.VCC", "b.VIN"], ["s.ECHO", "b.D14"], ["s.GND", "b.GND.1"]],
    );
    expectError(bad, "logic_level_5v_into_3v3_gpio", NO_ALTS);
    const good = guide(
      UNO,
      "usb_wall",
      [["b", UNO], ["s", "module.hc-sr04"]],
      [["s.VCC", "b.5V"], ["s.ECHO", "b.2"], ["s.TRIG", "b.3"], ["s.GND", "b.GND.1"]],
    );
    expect(codes(good)).not.toContain("logic_level_5v_into_3v3_gpio");
  });

  it("logic_level_overvoltage_input", () => {
    const bad = guide(
      UNO,
      "usb_wall",
      [["b", UNO], ["s", "module.tft.ili9341"]],
      [["s.MOSI", "b.11"]],
    );
    expectError(bad, "logic_level_overvoltage_input");
    const good = guide(
      ESP,
      "usb_wall",
      [["b", ESP], ["s", "module.tft.ili9341"]],
      [["s.VCC", "b.3V3"], ["s.MOSI", "b.D23"], ["s.GND", "b.GND.1"]],
    );
    expect(codes(good)).not.toContain("logic_level_overvoltage_input");
  });

  it("gpio_on_supply_rail", () => {
    const bad = guide(
      ESP,
      "usb_wall",
      [["b", ESP], ["u", "passive.power.usb_wall"]],
      [["u.5V", "b.D13"]],
    );
    expectError(bad, "gpio_on_supply_rail", NO_ALTS);
    const good = guide(
      ESP,
      "usb_wall",
      [["b", ESP], ["u", "passive.power.usb_wall"]],
      [["u.5V", "b.VIN"], ["u.GND", "b.GND.1"]],
    );
    expect(codes(good)).not.toContain("gpio_on_supply_rail");
  });

  it("logic_level_marginal (warning)", () => {
    const g = guide(
      ESP,
      "usb_wall",
      [["b", ESP], ["s", "module.neopixel"]],
      [["s.VDD", "b.VIN"], ["s.DIN", "b.D13"]],
    );
    expectWarning(g, "logic_level_marginal");
  });

  it("supply_over_voltage", () => {
    const uno5 = guide(
      UNO,
      "usb_wall",
      [["b", UNO], ["s", "module.tft.ili9341"]],
      [["s.VCC", "b.5V"]],
    );
    expectError(uno5, "supply_over_voltage", NO_ALTS);
    const batt = guide(
      ESP,
      "battery_18650",
      [["b", ESP], ["p", "passive.power.battery.18650"]],
      [["p.+", "b.3V3"], ["p.-", "b.GND.1"]],
    );
    expectError(batt, "supply_over_voltage", NO_ALTS);
    const ok = guide(
      ESP,
      "usb_wall",
      [["b", ESP], ["s", "module.tft.ili9341"]],
      [["s.VCC", "b.3V3"], ["s.GND", "b.GND.1"]],
    );
    expect(codes(ok)).not.toContain("supply_over_voltage");
  });

  it("supply_under_voltage", () => {
    const bad = guide(
      UNO,
      "battery_18650",
      [["b", UNO], ["p", "passive.power.battery.18650"], ["s", "module.hc-sr04"]],
      [["p.+", "s.VCC"], ["p.-", "s.GND"]],
    );
    expectError(bad, "supply_under_voltage");
    const good = guide(
      UNO,
      "usb_wall",
      [["b", UNO], ["s", "module.hc-sr04"]],
      [["s.VCC", "b.5V"], ["s.GND", "b.GND.1"]],
    );
    expect(codes(good)).not.toContain("supply_under_voltage");
  });

  it("supply_voltage_marginal (warning)", () => {
    const g = guide(
      ESP,
      "battery_2aa",
      [["b", ESP], ["p", "passive.power.battery.2aa"]],
      [["p.+", "b.3V3"], ["p.-", "b.GND.1"]],
    );
    expectWarning(g, "supply_voltage_marginal");
  });

  it("power_rails_shorted", () => {
    const bad = guide(ESP, "usb_wall", [["b", ESP]], [["b.VIN", "b.3V3"]]);
    expectError(bad, "power_rails_shorted", NO_ALTS);
    const good = guide(ESP, "usb_wall", [["b", ESP]], [["b.3V3", "b.D13"]]);
    expect(codes(good)).not.toContain("power_rails_shorted");
  });

  it("supply_sources_conflict", () => {
    const bad = guide(
      ESP,
      "battery_9v",
      [["b", ESP], ["a", "passive.power.battery.9v"], ["c", "passive.power.battery.18650"]],
      [["a.+", "b.VIN"], ["c.+", "b.VIN"], ["a.-", "b.GND.1"], ["c.-", "b.GND.1"]],
    );
    expectError(bad, "supply_sources_conflict", NO_ALTS);
    const good = guide(
      ESP,
      "battery_9v",
      [["b", ESP], ["a", "passive.power.battery.9v"]],
      [["a.+", "b.VIN"], ["a.-", "b.GND.1"]],
    );
    expect(codes(good)).not.toContain("supply_sources_conflict");
  });

  it("reverse_polarity", () => {
    const bad = guide(
      ESP,
      "battery_18650",
      [["b", ESP], ["p", "passive.power.battery.18650"]],
      [["p.+", "b.GND.1"], ["p.-", "b.VIN"]],
    );
    expectError(bad, "reverse_polarity");
    const good = guide(
      ESP,
      "battery_18650",
      [["b", ESP], ["p", "passive.power.battery.18650"]],
      [["p.+", "b.VIN"], ["p.-", "b.GND.1"]],
    );
    expect(codes(good)).not.toContain("reverse_polarity");
  });

  it("power_source_needs_regulation (warning)", () => {
    const g = guide(PICO, "battery_18650", [["b", PICO]], []);
    expectWarning(g, "power_source_needs_regulation");
    const usb = guide(PICO, "usb_wall", [["b", PICO]], []);
    expect(codes(usb)).not.toContain("power_source_needs_regulation");
  });
});

describe("validateGuide: battery chemistries and supplies", () => {
  const wired = (board: string, power: PowerSource, part: string, plusTo: string) =>
    guide(
      board,
      power,
      [["b", board], ["p", part]],
      [["p.+", plusTo], ["p.-", "b.GND.1"]],
    );

  it("treats 3xAA NiMH (3.6 V) as under-voltage for a 5 V VIN pin and says why", () => {
    const g = wired(ESP, "battery_3aa_nimh", "passive.power.battery.3aa_nimh", "b.VIN");
    expectError(g, "supply_under_voltage", NO_ALTS);
    const message = validateGuide(g).issues.find((i) => i.code === "supply_under_voltage")!.message;
    expect(message).toContain("3.6V");
    expect(message).toContain("NiMH cells are only 1.2V each");
    // The same cells in alkaline (4.5 V) are not under-voltage on this pin.
    const alk = wired(ESP, "battery_3aa", "passive.power.battery.3aa", "b.VIN");
    expect(codes(alk)).not.toContain("supply_under_voltage");
  });

  it("warns (not errors) for 4xAA NiMH (4.8 V) on a 5 V VIN pin because it sags", () => {
    const g = wired(ESP, "battery_4aa_nimh", "passive.power.battery.4aa_nimh", "b.VIN");
    expectWarning(g, "supply_voltage_marginal");
  });

  it("errors when a 2S LiPo (7.4 V) is wired to a 5 V pin", () => {
    const g = wired(UNO, "battery_lipo_2s", "passive.power.battery.lipo_2s", "b.5V");
    expectError(g, "supply_over_voltage", NO_ALTS);
    const ok = wired(UNO, "battery_lipo_2s", "passive.power.battery.lipo_2s", "b.VIN");
    expect(codes(ok)).not.toContain("supply_over_voltage");
  });

  it("allows a coin cell into the ESP32 3V3 pin with a current warning", () => {
    const g = wired(ESP, "battery_cr2032", "passive.power.battery.cr2032", "b.3V3");
    const r = validateGuide(g);
    expect(r.ok).toBe(true);
    expect(codes(g)).toContain("supply_voltage_marginal");
    expect(codes(g)).not.toContain("supply_over_voltage");
    expect(codes(g)).not.toContain("supply_under_voltage");
    const issue = r.issues.find((i) => i.code === "supply_current_limited")!;
    expect(issue.severity).toBe("warning");
    expect(issue.message).toMatch(/few milliamps/);
    expect(issue.message).toMatch(/capacitor/);
  });

  it("warns about coin-cell current when it is only the declared power source", () => {
    expectWarning(guide(ESP, "battery_cr2032", [["b", ESP]], []), "supply_current_limited");
    expect(codes(guide(ESP, "battery_3aa", [["b", ESP]], []))).not.toContain("supply_current_limited");
  });

  it("checks barrel supplies against the board VIN range", () => {
    const nine = wired(UNO, "supply_barrel_9v", "passive.power.supply.barrel_9v", "b.VIN");
    expect(codes(nine)).toEqual([]);
    const twelve = wired(UNO, "supply_barrel_12v", "passive.power.supply.barrel_12v", "b.VIN");
    expectWarning(twelve, "supply_voltage_marginal");
    expectError(
      wired(UNO, "supply_barrel_12v", "passive.power.supply.barrel_12v", "b.5V"),
      "supply_over_voltage",
      NO_ALTS,
    );
  });

  it("accepts a power bank like a USB wall adapter", () => {
    expect(codes(guide(PICO, "power_bank", [["b", PICO]], []))).not.toContain(
      "power_source_needs_regulation",
    );
  });

  it("warns that a declared 2S pack needs regulation on a 3.3 V-only board", () => {
    expectWarning(guide(PICO, "battery_lipo_2s", [["b", PICO]], []), "power_source_needs_regulation");
  });

  it("explains that a shorted LiPo can ignite", () => {
    const g = wired(UNO, "battery_lipo_1s", "passive.power.battery.lipo_1s", "b.GND.1");
    expectError(g, "reverse_polarity");
    expect(validateGuide(g).issues.find((i) => i.code === "reverse_polarity")!.message).toMatch(/ignite/);
  });
});
