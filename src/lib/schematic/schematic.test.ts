import { describe, expect, it, vi } from "vitest";
import type { Guide, GuideConnection, GuidePart } from "@/lib/catalog/types";
import type { CatalogPart } from "@/lib/catalog/types";
import type { SymbolKind, SymbolPinSpec, SymbolSpec } from "./types";

vi.mock("@/components/schematic/symbols", () => ({
  getSymbolKind: (catalogId: string): SymbolKind => {
    if (catalogId.includes("resistor")) return "resistor";
    if (catalogId.includes("led")) return "led";
    if (catalogId.includes("pushbutton")) return "pushbutton";
    if (catalogId.includes("potentiometer")) return "potentiometer";
    if (catalogId.startsWith("passive.power.")) return "battery";
    return "block";
  },
  getSymbolSpec: (kind: SymbolKind, part?: CatalogPart): SymbolSpec => {
    if (kind === "resistor") {
      return {
        kind,
        width: 60,
        height: 20,
        pins: { "1": { x: 0, y: 10, side: "left" }, "2": { x: 60, y: 10, side: "right" } },
      };
    }
    if (kind === "led") {
      return {
        kind,
        width: 50,
        height: 30,
        pins: { A: { x: 0, y: 15, side: "left" }, C: { x: 50, y: 15, side: "right" } },
      };
    }
    const pins: Record<string, SymbolPinSpec> = {};
    const list = part?.pins ?? [];
    const split = part?.kind === "board";
    list.forEach((pin, index) => {
      const right = split && index >= list.length / 2;
      const row = split ? (right ? index - Math.ceil(list.length / 2) : index) : index;
      pins[pin.id] = { x: right ? 120 : 0, y: 18 + row * 18, side: right ? "right" : "left" };
    });
    const rows = split ? Math.ceil(list.length / 2) : list.length;
    return { kind, width: 120, height: 36 + Math.max(rows - 1, 0) * 18, pins };
  },
}));

import { buildNets } from "./nets";
import { layoutSchematic } from "./layout";

const BOARD = "board.esp32.devkit";

function guide(parts: GuidePart[], connections: GuideConnection[]): Guide {
  return {
    id: "g",
    title: "t",
    power_source: null,
    board_id: BOARD,
    parts,
    connections,
    steps: [],
    notes: [],
    created_at: "",
    updated_at: "",
  };
}

function part(instanceId: string, catalogId: string): GuidePart {
  return { instanceId, catalogId };
}

let counter = 0;
function conn(from: [string, string], to: [string, string]): GuideConnection {
  counter += 1;
  return {
    id: `c${counter}`,
    from: { instanceId: from[0], pinId: from[1] },
    to: { instanceId: to[0], pinId: to[1] },
  };
}

function seriesGuide(): Guide {
  return guide(
    [part("esp", BOARD), part("r1", "passive.resistor.220"), part("led", "passive.led.red")],
    [
      { ...conn(["esp", "D4"], ["r1", "1"]), id: "c1" },
      { ...conn(["r1", "2"], ["led", "A"]), id: "c2" },
      { ...conn(["led", "C"], ["esp", "GND.1"]), id: "c3" },
    ],
  );
}

function bigGuide(): Guide {
  return guide(
    [
      part("usb", "passive.power.usb_wall"),
      part("esp", BOARD),
      part("r1", "passive.resistor.220"),
      part("r2", "passive.resistor.220"),
      part("led1", "passive.led.red"),
      part("led2", "passive.led.green"),
      part("buzz", "module.buzzer.active"),
      part("btn", "passive.pushbutton"),
    ],
    [
      { ...conn(["usb", "5V"], ["esp", "VIN"]), id: "p1" },
      { ...conn(["usb", "GND"], ["esp", "GND.2"]), id: "p2" },
      { ...conn(["esp", "D4"], ["r1", "1"]), id: "s1" },
      { ...conn(["r1", "2"], ["led1", "A"]), id: "s2" },
      { ...conn(["led1", "C"], ["esp", "GND.1"]), id: "s3" },
      { ...conn(["esp", "D13"], ["r2", "1"]), id: "s4" },
      { ...conn(["r2", "2"], ["led2", "A"]), id: "s5" },
      { ...conn(["led2", "C"], ["esp", "GND.1"]), id: "s6" },
      { ...conn(["esp", "D14"], ["buzz", "1"]), id: "s7" },
      { ...conn(["buzz", "2"], ["esp", "GND.1"]), id: "s8" },
      { ...conn(["esp", "D27"], ["btn", "1.l"]), id: "s9" },
      { ...conn(["btn", "2.r"], ["esp", "GND.1"]), id: "s10" },
    ],
  );
}

function pinPoint(layout: ReturnType<typeof layoutSchematic>, instanceId: string, pinId: string) {
  const found = layout.parts.find((entry) => entry.instanceId === instanceId);
  const pin = found?.pins.find((entry) => entry.pinId === pinId);
  if (!pin) throw new Error(`no pin ${instanceId}.${pinId}`);
  return { x: pin.x, y: pin.y };
}

describe("buildNets", () => {
  it("builds series nets and a ground net", () => {
    const nets = buildNets(seriesGuide());
    expect(nets.map((net) => net.kind).sort()).toEqual(["ground", "signal", "signal"]);
    const ground = nets.find((net) => net.kind === "ground");
    expect(ground?.label).toBe("GND");
    expect(ground?.pins).toHaveLength(2);
    const first = nets.find((net) => net.pins.some((pin) => pin.pinId === "D4"));
    expect(first?.label).toBe("D4");
    expect(first?.pins.map((pin) => pin.instanceId).sort()).toEqual(["esp", "r1"]);
  });

  it("joins parallel branches into one net", () => {
    const nets = buildNets(
      guide(
        [part("esp", BOARD), part("r1", "passive.resistor.220"), part("r2", "passive.resistor.1k")],
        [conn(["esp", "D4"], ["r1", "1"]), conn(["esp", "D4"], ["r2", "1"])],
      ),
    );
    expect(nets).toHaveLength(1);
    expect(nets[0].pins).toHaveLength(3);
    expect(nets[0].connectionIds).toHaveLength(2);
  });

  it("shares one ground net across parts", () => {
    const nets = buildNets(
      guide(
        [part("esp", BOARD), part("a", "passive.led.red"), part("b", "passive.led.green")],
        [
          { ...conn(["a", "C"], ["esp", "GND.1"]), id: "g1" },
          { ...conn(["b", "C"], ["esp", "GND.1"]), id: "g2" },
        ],
      ),
    );
    expect(nets).toHaveLength(1);
    expect(nets[0].kind).toBe("ground");
    expect(nets[0].pins).toHaveLength(3);
    expect(nets[0].connectionIds).toEqual(["g1", "g2"]);
  });

  it("labels a power net by its supply pin", () => {
    const nets = buildNets(
      guide(
        [part("esp", BOARD), part("r", "passive.resistor.220")],
        [conn(["esp", "3V3"], ["r", "1"])],
      ),
    );
    expect(nets).toHaveLength(1);
    expect(nets[0].kind).toBe("power");
    expect(nets[0].label).toBe("3V3");
  });

  it("treats the breadboard as transparent", () => {
    const g = guide(
      [part("esp", BOARD), part("bb", "passive.breadboard.half"), part("led", "passive.led.red")],
      [
        { ...conn(["esp", "D4"], ["bb", "a5"]), id: "b1" },
        { ...conn(["bb", "c5"], ["led", "A"]), id: "b2" },
      ],
    );
    const nets = buildNets(g);
    expect(nets).toHaveLength(1);
    expect(nets[0].pins.map((pin) => pin.instanceId).sort()).toEqual(["esp", "led"]);
    expect(nets[0].connectionIds).toEqual(["b1", "b2"]);
    const layout = layoutSchematic(g);
    expect(layout.skipped).toEqual(["bb"]);
    expect(layout.parts.map((entry) => entry.instanceId)).not.toContain("bb");
    expect(layout.wires).toHaveLength(1);
    expect(layout.wires[0].connectionId).toBe("b2");
  });

  it("does not join across the breadboard centre gap", () => {
    const nets = buildNets(
      guide(
        [part("esp", BOARD), part("bb", "passive.breadboard.half"), part("led", "passive.led.red")],
        [conn(["esp", "D4"], ["bb", "a5"]), conn(["bb", "f5"], ["led", "A"])],
      ),
    );
    expect(nets).toHaveLength(0);
  });

  it("joins breadboard rails along their length as ground", () => {
    const nets = buildNets(
      guide(
        [part("esp", BOARD), part("bb", "passive.breadboard.half"), part("led", "passive.led.red")],
        [conn(["esp", "GND.1"], ["bb", "-.b.3"]), conn(["bb", "-.b.20"], ["led", "C"])],
      ),
    );
    expect(nets).toHaveLength(1);
    expect(nets[0].kind).toBe("ground");
  });

  it("tolerates dangling and unknown pins and unknown parts", () => {
    const g = guide(
      [part("esp", BOARD), part("x", "part.does.not.exist"), part("r", "passive.resistor.220")],
      [
        conn(["esp", "D4"], ["ghost", "1"]),
        conn(["esp", "D5"], ["r", "ZZ"]),
        conn(["esp", "D13"], ["x", "1"]),
        conn(["esp", "D14"], ["r", "1"]),
      ],
    );
    expect(() => buildNets(g)).not.toThrow();
    const nets = buildNets(g);
    expect(nets).toHaveLength(1);
    expect(nets[0].pins.map((pin) => pin.pinId).sort()).toEqual(["1", "D14"]);
    const layout = layoutSchematic(g);
    expect(layout.skipped).toEqual(["x"]);
    expect(layout.parts.map((entry) => entry.instanceId)).not.toContain("x");
  });
});

describe("layoutSchematic", () => {
  it("places the series resistor inline, left of its LED and right of the board", () => {
    const layout = layoutSchematic(seriesGuide());
    const get = (id: string) => layout.parts.find((entry) => entry.instanceId === id);
    const esp = get("esp");
    const r1 = get("r1");
    const led = get("led");
    if (!esp || !r1 || !led) throw new Error("missing parts");
    expect(r1.x).toBeGreaterThan(esp.x + esp.width);
    expect(led.x).toBeGreaterThan(r1.x + r1.width);
    expect(pinPoint(layout, "r1", "2").y).toBe(pinPoint(layout, "led", "A").y);
    expect(layout.rails.filter((rail) => rail.kind === "ground")).toHaveLength(2);
    expect(layout.wires.map((wire) => wire.connectionId).sort()).toEqual(["c1", "c2"]);
  });

  it("puts power sources left, the board centre and modules right", () => {
    const layout = layoutSchematic(bigGuide());
    const get = (id: string) => layout.parts.find((entry) => entry.instanceId === id);
    const usb = get("usb");
    const esp = get("esp");
    const buzz = get("buzz");
    if (!usb || !esp || !buzz) throw new Error("missing parts");
    expect(usb.x + usb.width).toBeLessThan(esp.x);
    expect(buzz.x).toBeGreaterThan(esp.x + esp.width);
  });

  it("assigns reference designators and value text", () => {
    const layout = layoutSchematic(bigGuide());
    const ref = (id: string) => layout.parts.find((entry) => entry.instanceId === id);
    expect(ref("esp")?.refDes).toBe("U1");
    expect(ref("buzz")?.refDes).toBe("U2");
    expect(ref("usb")?.refDes).toBe("BT1");
    expect(ref("r1")?.refDes).toBe("R1");
    expect(ref("r2")?.refDes).toBe("R2");
    expect(ref("led1")?.refDes).toBe("D1");
    expect(ref("btn")?.refDes).toBe("SW1");
    expect(ref("r1")?.valueText).toBe("220 ohm");
    expect(ref("led1")?.valueText).toBe("red");
    expect(ref("led2")?.valueText).toBe("green");
  });

  it("lists every net connection on its rails", () => {
    const layout = layoutSchematic(bigGuide());
    const ground = layout.nets.find((net) => net.kind === "ground" && net.connectionIds.includes("s3"));
    expect(ground).toBeDefined();
    const rails = layout.rails.filter((rail) => rail.netId === ground?.id);
    expect(rails.length).toBeGreaterThan(1);
    for (const rail of rails) expect(rail.connectionIds).toEqual(ground?.connectionIds);
  });

  it("keeps parts from overlapping", () => {
    const layout = layoutSchematic(bigGuide());
    for (let i = 0; i < layout.parts.length; i++) {
      for (let j = i + 1; j < layout.parts.length; j++) {
        const a = layout.parts[i];
        const b = layout.parts[j];
        const apart =
          a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(apart, `${a.instanceId} overlaps ${b.instanceId}`).toBe(true);
      }
    }
  });

  it("keeps every coordinate finite and inside the canvas", () => {
    for (const g of [bigGuide(), seriesGuide()]) {
      const layout = layoutSchematic(g);
      const inside = (x: number, y: number) => {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(layout.width);
        expect(y).toBeLessThanOrEqual(layout.height);
      };
      for (const entry of layout.parts) {
        inside(entry.x, entry.y);
        inside(entry.x + entry.width, entry.y + entry.height);
        for (const pin of entry.pins) inside(pin.x, pin.y);
      }
      for (const wire of layout.wires) for (const point of wire.points) inside(point.x, point.y);
      for (const rail of layout.rails) {
        inside(rail.at.x, rail.at.y);
        inside(rail.stubFrom.x, rail.stubFrom.y);
      }
    }
  });

  it("ends each wire on the pins of its net", () => {
    const g = bigGuide();
    const layout = layoutSchematic(g);
    expect(layout.wires.length).toBeGreaterThan(0);
    for (const wire of layout.wires) {
      const net = layout.nets.find((entry) => entry.id === wire.netId);
      const pins = (net?.pins ?? []).map((ref) => pinPoint(layout, ref.instanceId, ref.pinId));
      const start = wire.points[0];
      const end = wire.points[wire.points.length - 1];
      expect(pins.some((pin) => pin.x === start.x && pin.y === start.y)).toBe(true);
      expect(pins.some((pin) => pin.x === end.x && pin.y === end.y)).toBe(true);
      for (let i = 1; i < wire.points.length; i++) {
        const a = wire.points[i - 1];
        const b = wire.points[i];
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
    }
  });

  it("matches the pin coordinates of a direct connection", () => {
    const layout = layoutSchematic(seriesGuide());
    const wire = layout.wires.find((entry) => entry.connectionId === "c1");
    const start = pinPoint(layout, "esp", "D4");
    const end = pinPoint(layout, "r1", "1");
    expect(wire?.points[0]).toEqual(start);
    expect(wire?.points[wire.points.length - 1]).toEqual(end);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(layoutSchematic(bigGuide()))).toBe(JSON.stringify(layoutSchematic(bigGuide())));
  });

  it("flags guides with too many parts", () => {
    expect(layoutSchematic(bigGuide()).tooComplex).toBe(false);
    const parts = [part("esp", BOARD)];
    const connections: GuideConnection[] = [];
    for (let i = 0; i < 9; i++) {
      parts.push(part(`l${i}`, "passive.led.red"));
      connections.push({ ...conn([`l${i}`, "C"], ["esp", "GND.1"]), id: `x${i}` });
    }
    expect(layoutSchematic(guide(parts, connections)).tooComplex).toBe(true);
  });

  it("handles an empty guide", () => {
    const layout = layoutSchematic(guide([], []));
    expect(layout.parts).toEqual([]);
    expect(Number.isFinite(layout.width)).toBe(true);
    expect(layout.tooComplex).toBe(false);
  });
});
