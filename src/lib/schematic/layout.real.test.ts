import { describe, expect, it } from "vitest";
import { getCatalogPart, listCatalog } from "@/lib/catalog";
import type { CatalogPart, Guide, GuideConnection, GuidePart } from "@/lib/catalog/types";
import { layoutSchematic } from "./layout";
import type { SchematicLayout } from "./types";

const ESP = "board.esp32.devkit";

function make(parts: GuidePart[], connections: [string, string, string, string][]): Guide {
  return {
    id: "g",
    title: "t",
    power_source: null,
    board_id: parts.find((part) => getCatalogPart(part.catalogId)?.kind === "board")?.catalogId ?? null,
    parts,
    connections: connections.map(
      ([fi, fp, ti, tp], n): GuideConnection => ({
        id: `c${n + 1}`,
        from: { instanceId: fi, pinId: fp },
        to: { instanceId: ti, pinId: tp },
      }),
    ),
    steps: [],
    notes: [],
    created_at: "",
    updated_at: "",
  };
}

function wirePins(board: CatalogPart, mod: CatalogPart): [string, string, string, string][] {
  const boardPins = board.pins;
  const supply = boardPins.find((pin) => pin.kinds.includes("power") && pin.voltage === "3v3") ??
    boardPins.find((pin) => pin.kinds.includes("power"));
  const ground = boardPins.find((pin) => pin.kinds.includes("ground"));
  const usedBoard = new Set<string>();
  const out: [string, string, string, string][] = [];
  for (const pin of mod.pins) {
    if (pin.kinds.includes("ground") && ground) {
      out.push(["mcu", ground.id, "mod", pin.id]);
    } else if (pin.kinds.includes("power") && supply) {
      out.push(["mcu", supply.id, "mod", pin.id]);
    } else {
      const wanted = pin.kinds.find((kind) => kind !== "power" && kind !== "ground") ?? "digital";
      const target =
        boardPins.find((candidate) => !usedBoard.has(candidate.id) && candidate.kinds.includes(wanted)) ??
        boardPins.find(
          (candidate) =>
            !usedBoard.has(candidate.id) && !candidate.kinds.includes("power") && !candidate.kinds.includes("ground"),
        );
      if (!target) continue;
      usedBoard.add(target.id);
      out.push(["mcu", target.id, "mod", pin.id]);
    }
  }
  return out;
}

function recipeGuides(): { name: string; guide: Guide }[] {
  const out: { name: string; guide: Guide }[] = [];
  for (const recipe of listCatalog().recipes) {
    for (const boardId of recipe.boardIds) {
      const board = getCatalogPart(boardId);
      if (!board) continue;
      for (const moduleId of recipe.moduleIds) {
        const mod = getCatalogPart(moduleId);
        if (!mod) continue;
        out.push({
          name: `${recipe.id} ${boardId} ${moduleId}`,
          guide: make(
            [
              { instanceId: "mcu", catalogId: boardId },
              { instanceId: "mod", catalogId: moduleId },
            ],
            wirePins(board, mod),
          ),
        });
      }
    }
  }
  return out;
}

function powerSourceGuides(): { name: string; guide: Guide }[] {
  const board = getCatalogPart(ESP) as CatalogPart;
  return listCatalog()
    .passives.filter((part) => part.id.startsWith("passive.power."))
    .map((source) => {
      const plus = source.pins.find((pin) => pin.kinds.includes("power"));
      const minus = source.pins.find((pin) => pin.kinds.includes("ground"));
      const vin = board.pins.find((pin) => pin.id === "VIN") ?? board.pins.find((pin) => pin.kinds.includes("power"));
      const gnd = board.pins.find((pin) => pin.kinds.includes("ground"));
      return {
        name: source.id,
        guide: make(
          [
            { instanceId: "src", catalogId: source.id },
            { instanceId: "mcu", catalogId: ESP },
            { instanceId: "r1", catalogId: "passive.resistor.220" },
            { instanceId: "led", catalogId: "passive.led.red" },
          ],
          [
            ["src", (plus as { id: string }).id, "mcu", (vin as { id: string }).id],
            ["src", (minus as { id: string }).id, "mcu", (gnd as { id: string }).id],
            ["mcu", "D4", "r1", "1"],
            ["r1", "2", "led", "A"],
            ["led", "C", "mcu", (gnd as { id: string }).id],
          ],
        ),
      };
    });
}

function handBuilt(): { name: string; guide: Guide }[] {
  return [
    {
      name: "esp32 resistor led",
      guide: make(
        [
          { instanceId: "mcu", catalogId: ESP },
          { instanceId: "r1", catalogId: "passive.resistor.220" },
          { instanceId: "led", catalogId: "passive.led.red" },
        ],
        [
          ["mcu", "D4", "r1", "1"],
          ["r1", "2", "led", "A"],
          ["led", "C", "mcu", "GND.1"],
        ],
      ),
    },
    {
      name: "esp32 oled",
      guide: make(
        [
          { instanceId: "mcu", catalogId: ESP },
          { instanceId: "mod", catalogId: "module.oled.ssd1306" },
        ],
        [
          ["mcu", "D21", "mod", "DATA"],
          ["mcu", "D22", "mod", "CLK"],
          ["mcu", "3V3", "mod", "3V3"],
          ["mcu", "GND.1", "mod", "GND"],
        ],
      ),
    },
    {
      name: "esp32 breadboard led",
      guide: make(
        [
          { instanceId: "mcu", catalogId: ESP },
          { instanceId: "bb", catalogId: "passive.breadboard.half" },
          { instanceId: "r1", catalogId: "passive.resistor.220" },
          { instanceId: "led", catalogId: "passive.led.red" },
        ],
        [
          ["mcu", "D4", "bb", "a5"],
          ["bb", "b5", "r1", "1"],
          ["r1", "2", "led", "A"],
          ["led", "C", "bb", "-"],
          ["bb", "-", "mcu", "GND.1"],
        ],
      ),
    },
    {
      name: "esp32 pot and button",
      guide: make(
        [
          { instanceId: "mcu", catalogId: ESP },
          { instanceId: "pot", catalogId: "passive.potentiometer" },
          { instanceId: "btn", catalogId: "passive.pushbutton" },
        ],
        [
          ["mcu", "3V3", "pot", "VCC"],
          ["mcu", "D34", "pot", "SIG"],
          ["mcu", "GND.1", "pot", "GND"],
          ["mcu", "D27", "btn", "1.l"],
          ["btn", "2.r", "mcu", "GND.1"],
        ],
      ),
    },
  ];
}

function boxesOverlap(a: SchematicLayout["parts"][number], b: SchematicLayout["parts"][number]): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function check(name: string, guide: Guide) {
  const layout = layoutSchematic(guide);
  const connected = new Set<string>();
  for (const connection of guide.connections) {
    connected.add(`${connection.from.instanceId}:${connection.from.pinId}`);
    connected.add(`${connection.to.instanceId}:${connection.to.pinId}`);
  }

  expect(Number.isFinite(layout.width), name).toBe(true);
  expect(Number.isFinite(layout.height), name).toBe(true);

  const byId = new Map(layout.parts.map((part) => [part.instanceId, part]));
  for (const part of layout.parts) {
    for (const value of [part.x, part.y, part.width, part.height]) expect(Number.isFinite(value), name).toBe(true);
    for (const pin of part.pins) {
      expect(Number.isFinite(pin.x) && Number.isFinite(pin.y), `${name} ${part.instanceId}.${pin.pinId}`).toBe(true);
    }
  }
  for (const key of connected) {
    const [instanceId, pinId] = key.split(":");
    const part = byId.get(instanceId);
    const catalogPart = guide.parts.find((entry) => entry.instanceId === instanceId);
    const cat = catalogPart ? getCatalogPart(catalogPart.catalogId) : undefined;
    if (!part || !cat || cat.id.startsWith("passive.breadboard")) continue;
    if (!cat.pins.some((pin) => pin.id === pinId)) continue;
    expect(part.pins.some((pin) => pin.pinId === pinId), `${name}: pin ${key} missing`).toBe(true);
  }
  for (let i = 0; i < layout.parts.length; i++) {
    for (let j = i + 1; j < layout.parts.length; j++) {
      expect(boxesOverlap(layout.parts[i], layout.parts[j]), `${name}: ${layout.parts[i].refDes} overlaps ${layout.parts[j].refDes}`).toBe(
        false,
      );
    }
  }

  const pinPoints = new Set<string>();
  for (const part of layout.parts) for (const pin of part.pins) pinPoints.add(`${pin.x},${pin.y}`);
  for (const wire of layout.wires) {
    expect(wire.points.length, name).toBeGreaterThanOrEqual(2);
    for (const point of wire.points) expect(Number.isFinite(point.x) && Number.isFinite(point.y), name).toBe(true);
    const first = wire.points[0];
    const last = wire.points[wire.points.length - 1];
    expect(pinPoints.has(`${first.x},${first.y}`), `${name}: wire start off pin`).toBe(true);
    expect(pinPoints.has(`${last.x},${last.y}`), `${name}: wire end off pin`).toBe(true);
    for (let i = 1; i < wire.points.length; i++) {
      const a = wire.points[i - 1];
      const b = wire.points[i];
      expect(a.x === b.x || a.y === b.y, `${name}: diagonal segment`).toBe(true);
    }
  }
  for (const rail of layout.rails) {
    expect(pinPoints.has(`${rail.stubFrom.x},${rail.stubFrom.y}`), `${name}: rail off pin`).toBe(true);
    expect(Number.isFinite(rail.at.x) && Number.isFinite(rail.at.y), name).toBe(true);
  }
  return layout;
}

describe("layoutSchematic with the real symbol specs", () => {
  const recipes = recipeGuides();

  it("covers every recipe", () => {
    expect(recipes.length).toBeGreaterThan(10);
  });

  it.each(recipes.map((entry) => [entry.name, entry.guide] as const))("recipe %s", (name, guide) => {
    check(name, guide);
  });

  it.each(handBuilt().map((entry) => [entry.name, entry.guide] as const))("%s", (name, guide) => {
    check(name, guide);
  });

  it.each(powerSourceGuides().map((entry) => [entry.name, entry.guide] as const))("powered by %s", (name, guide) => {
    const layout = check(name, guide);
    expect(layout.parts.some((part) => part.instanceId === "src")).toBe(true);
  });

  it("keeps the breadboard out of the drawing", () => {
    const entry = handBuilt().find((item) => item.name === "esp32 breadboard led");
    const layout = check("bb", (entry as { guide: Guide }).guide);
    expect(layout.skipped).toEqual(["bb"]);
  });

  it("flips a series resistor whose pin 2 faces the board", () => {
    const guide = make(
      [
        { instanceId: "mcu", catalogId: ESP },
        { instanceId: "r1", catalogId: "passive.resistor.220" },
        { instanceId: "led", catalogId: "passive.led.red" },
      ],
      [
        ["mcu", "D4", "r1", "2"],
        ["r1", "1", "led", "A"],
        ["led", "C", "mcu", "GND.1"],
      ],
    );
    const layout = check("flipped", guide);
    const resistor = layout.parts.find((part) => part.instanceId === "r1");
    const pin2 = resistor?.pins.find((pin) => pin.pinId === "2");
    const pin1 = resistor?.pins.find((pin) => pin.pinId === "1");
    expect(pin2 && pin1 && pin2.x < pin1.x).toBe(true);
    const topOfParts = Math.min(...layout.parts.map((part) => part.y));
    for (const wire of layout.wires) {
      for (const point of wire.points) expect(point.y).toBeGreaterThanOrEqual(topOfParts - 1);
    }
  });

  it("keeps a single-pin signal connection as a stub wire to a board pin", () => {
    const guide = make(
      [
        { instanceId: "mcu", catalogId: ESP },
        { instanceId: "r1", catalogId: "passive.resistor.220" },
      ],
      [["mcu", "D4", "r1", "1"]],
    );
    const layout = check("pair", guide);
    expect(layout.wires.length).toBe(1);
  });
});
