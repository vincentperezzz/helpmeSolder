import { describe, expect, it } from "vitest";
import type { Guide } from "@/lib/catalog/types";
import {
  layoutFeedback,
  toBreadboardLayout,
  toBreadboardLayoutWithWarnings,
  toDirectLayout,
} from "./layout-variants";
import { hasBreadboard } from "./solder-plan";
import { buildNets } from "./validator";

type Wire = [string, string, string, string];

function make(
  parts: Array<[string, string]>,
  wires: Wire[],
  power: Guide["power_source"] = "usb_wall",
): Guide {
  return {
    id: "g",
    title: "t",
    power_source: power,
    board_id: "board.esp32.devkit",
    parts: parts.map(([instanceId, catalogId]) => ({ instanceId, catalogId })),
    connections: wires.map(([fi, fp, ti, tp], n) => ({
      id: `c${n}`,
      from: { instanceId: fi, pinId: fp },
      to: { instanceId: ti, pinId: tp },
    })),
    steps: [],
    notes: [],
    created_at: "",
    updated_at: "",
  };
}

/** Nets as sorted sets of non-breadboard pin references (single-pin nets ignored). */
function netSet(guide: Guide): string[] {
  return buildNets(guide)
    .map((net) => net.pins.map((p) => `${p.part.instanceId}:${p.pin.id}`).sort().join(" "))
    .filter((key) => key.includes(" "))
    .sort();
}

const buzzer = make(
  [
    ["mcu", "board.esp32.devkit"],
    ["buz", "module.buzzer.active"],
  ],
  [
    ["mcu", "D2", "buz", "1"],
    ["mcu", "GND.1", "buz", "2"],
  ],
);

const ledGuide = make(
  [
    ["mcu", "board.esp32.devkit"],
    ["r", "passive.resistor.220"],
    ["led", "passive.led.red"],
  ],
  [
    ["mcu", "D4", "r", "1"],
    ["r", "2", "led", "A"],
    ["led", "C", "mcu", "GND.1"],
  ],
);

const multi = make(
  [
    ["mcu", "board.esp32.devkit"],
    ["dht", "module.dht22"],
    ["pir", "module.pir.motion"],
    ["us", "module.hc-sr04"],
  ],
  [
    ["mcu", "3V3", "dht", "VCC"],
    ["mcu", "GND.1", "dht", "GND"],
    ["mcu", "D2", "dht", "SDA"],
    ["mcu", "3V3", "pir", "VCC"],
    ["mcu", "GND.1", "pir", "GND"],
    ["mcu", "D4", "pir", "OUT"],
    ["mcu", "GND.1", "us", "GND"],
    ["mcu", "D5", "us", "TRIG"],
  ],
);

const withBoard = toBreadboardLayout(ledGuide);

describe("breadboard layout", () => {
  it("adds one breadboard and does not mutate the input", () => {
    const before = JSON.stringify(buzzer);
    const out = toBreadboardLayout(buzzer);
    expect(JSON.stringify(buzzer)).toBe(before);
    expect(out.parts.filter((p) => p.catalogId === "passive.breadboard.half")).toHaveLength(1);
    expect(hasBreadboard(out)).toBe(true);
    expect(out.connections.every((c) => /^bb-\d+$/.test(c.id))).toBe(true);
  });

  it("puts ground on a minus rail and each signal in its own column half", () => {
    const out = toBreadboardLayout(buzzer);
    const ends = out.connections.map((c) => c.to.pinId);
    expect(ends.filter((p) => p.startsWith("-.t."))).toHaveLength(2);
    const holes = ends.filter((p) => /^[a-j]\d+$/.test(p));
    expect(holes).toHaveLength(2);
    expect(new Set(holes.map((h) => h.slice(1))).size).toBe(1);
  });

  it("returns an existing breadboard guide unchanged", () => {
    expect(toBreadboardLayout(withBoard)).toBe(withBoard);
    expect(toDirectLayout(buzzer)).toBe(buzzer);
  });

  it("keeps every net for plain guides", () => {
    for (const g of [buzzer, ledGuide, multi]) {
      const bb = toBreadboardLayout(g);
      expect(toBreadboardLayoutWithWarnings(g).warnings).toEqual([]);
      expect(netSet(bb)).toEqual(netSet(g));
      expect(netSet(toDirectLayout(bb))).toEqual(netSet(g));
    }
  });

  it("round trips a guide that already has a breadboard", () => {
    const direct = toDirectLayout(withBoard);
    expect(hasBreadboard(direct)).toBe(false);
    expect(direct.connections.every((c) => /^direct-\d+$/.test(c.id))).toBe(true);
    expect(netSet(direct)).toEqual(netSet(ledGuide));
    expect(netSet(toBreadboardLayout(direct))).toEqual(netSet(ledGuide));
  });

  it("handles a hand-written breadboard recipe", () => {
    const hand = make(
      [
        ["mcu", "board.esp32.devkit"],
        ["bb", "passive.breadboard.half"],
        ["r", "passive.resistor.220"],
        ["led", "passive.led.red"],
      ],
      [
        ["mcu", "D4", "bb", "a5"],
        ["r", "1", "bb", "b5"],
        ["r", "2", "bb", "a10"],
        ["led", "A", "bb", "b10"],
        ["led", "C", "bb", "-.t.3"],
        ["mcu", "GND.1", "bb", "-.t.7"],
      ],
    );
    const direct = toDirectLayout(hand);
    expect(netSet(direct)).toEqual(netSet(hand));
    expect(netSet(toBreadboardLayout(direct))).toEqual(netSet(hand));
  });

  it("reports no new errors for the simple layouts", () => {
    expect(layoutFeedback(buzzer, toBreadboardLayout(buzzer))).toEqual([]);
    expect(layoutFeedback(buzzer, buzzer)).toEqual([]);
  });
});
