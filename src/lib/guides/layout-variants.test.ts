import { describe, expect, it } from "vitest";
import type { Guide } from "@/lib/catalog/types";
import {
  layoutFeedback,
  toBreadboardLayout,
  toBreadboardLayoutWithWarnings,
  toDirectLayout,
} from "./layout-variants";
import { layoutParts } from "@/components/wokwi/layout";
import { breadboardHoleLocal } from "@/components/wokwi/breadboard";
import { rotatePoint } from "@/components/wokwi/plug";
import { buildSolderItems, hasBreadboard, isPlugConnection } from "./solder-plan";
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
    expect(out.connections.every((c) => /^(bb|plug)-\d+$/.test(c.id))).toBe(true);
  });

  it("plugs the buzzer into two strips and jumps the board pins to them", () => {
    const out = toBreadboardLayout(buzzer);
    const plugs = out.connections.filter(isPlugConnection);
    expect(plugs).toHaveLength(2);
    expect(plugs.every((c) => c.from.instanceId === "buz" && /^e\d+$/.test(c.to.pinId))).toBe(true);
    const cols = plugs.map((c) => c.to.pinId.slice(1));
    expect(new Set(cols).size).toBe(2);

    const jumpers = out.connections.filter((c) => !isPlugConnection(c));
    // D2 jumps from the board into the signal leg's strip; GND goes to the minus rail.
    const signal = jumpers.find((c) => c.from.pinId === "D2");
    const signalCol = plugs.find((c) => c.from.pinId === "1")?.to.pinId.slice(1);
    expect(signal?.from.instanceId).toBe("mcu");
    expect(signal?.to.pinId).toMatch(new RegExp(`^[a-d]${signalCol}$`));
    const ground = jumpers.find((c) => c.from.pinId === "GND.1");
    expect(ground?.to.pinId).toMatch(/^-\.t\.\d+$/);
    // The buzzer's ground leg reaches the same rail from its own strip.
    const legCol = plugs.find((c) => c.from.pinId === "2")?.to.pinId.slice(1);
    const leg = jumpers.find((c) => /^[a-d]\d+$/.test(c.from.pinId));
    expect(leg?.from.pinId).toMatch(new RegExp(`^[a-d]${legCol}$`));
    expect(leg?.to.pinId).toBe(`-.t.${legCol}`);
  });

  it("never lets two nets share a column strip", () => {
    for (const g of [buzzer, ledGuide, multi]) {
      const out = toBreadboardLayout(g);
      const stripNet = new Map<string, number>();
      const nets = buildNets(out);
      nets.forEach((net, index) => {
        for (const item of net.pins) {
          for (const c of out.connections) {
            const end =
              c.from.instanceId === item.part.instanceId && c.from.pinId === item.pin.id
                ? c.to
                : c.to.instanceId === item.part.instanceId && c.to.pinId === item.pin.id
                  ? c.from
                  : null;
            const hole = end && /^([a-j])(\d+)$/.exec(end.pinId);
            if (!hole) continue;
            const key = `${hole[1] <= "e" ? "t" : "b"}${hole[2]}`;
            if (stripNet.has(key) && stripNet.get(key) !== index) {
              throw new Error(`strip ${key} shared by two nets`);
            }
            stripNet.set(key, index);
          }
        }
      });
    }
  });

  it("numbers only real wires: plug links are not in the solder plan", () => {
    const out = toBreadboardLayout(buzzer);
    const items = buildSolderItems(out);
    const wires = out.connections.filter((c) => !isPlugConnection(c));
    expect(items.map((item) => item.id).sort()).toEqual(wires.map((c) => c.id).sort());
    expect(items.some((item) => item.id.startsWith("plug-"))).toBe(false);
  });

  it("seats a plugged part so its legs land on the holes", () => {
    const out = toBreadboardLayout(buzzer);
    const placed = layoutParts(out);
    const bb = placed.find((p) => p.instanceId === "breadboard") as (typeof placed)[number];
    const part = placed.find((p) => p.instanceId === "buz") as (typeof placed)[number];
    expect(part.seated).toBe(true);
    expect(part.plug).toBeDefined();
    for (const c of out.connections.filter(isPlugConnection)) {
      const turned = rotatePoint(part.plug as NonNullable<typeof part.plug>, (part.plug as NonNullable<typeof part.plug>).pins[c.from.pinId]);
      const hole = breadboardHoleLocal(c.to.pinId) as { x: number; y: number };
      expect(part.x + turned.x).toBeCloseTo(bb.x + hole.x, 5);
      expect(part.y + turned.y).toBeCloseTo(bb.y + hole.y, 5);
    }
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
