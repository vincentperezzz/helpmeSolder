import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCatalogPart, listCatalog } from "@/lib/catalog";
import type { Guide } from "@/lib/catalog/types";
import { layoutSchematic } from "@/lib/schematic/layout";
import { SchematicDiagram } from "./SchematicDiagram";

const ESP = "board.esp32.devkit";

function guide(
  parts: [string, string][],
  connections: [string, string, string, string][],
): Guide {
  return {
    id: "g",
    title: "t",
    power_source: null,
    board_id: ESP,
    parts: parts.map(([instanceId, catalogId]) => ({ instanceId, catalogId })),
    connections: connections.map(([fi, fp, ti, tp], n) => ({
      id: `c${n + 1}`,
      from: { instanceId: fi, pinId: fp },
      to: { instanceId: ti, pinId: tp },
    })),
    steps: [],
    notes: [],
    created_at: "",
    updated_at: "",
  };
}

function ledGuide(): Guide {
  return guide(
    [
      ["mcu", ESP],
      ["r1", "passive.resistor.220"],
      ["led", "passive.led.red"],
    ],
    [
      ["mcu", "D4", "r1", "1"],
      ["r1", "2", "led", "A"],
      ["led", "C", "mcu", "GND.1"],
    ],
  );
}

function twoLedGuide(): Guide {
  return guide(
    [
      ["mcu", ESP],
      ["r1", "passive.resistor.220"],
      ["led1", "passive.led.red"],
      ["r2", "passive.resistor.220"],
      ["led2", "passive.led.green"],
    ],
    [
      ["mcu", "D4", "r1", "1"],
      ["r1", "2", "led1", "A"],
      ["mcu", "D13", "r2", "1"],
      ["r2", "2", "led2", "A"],
    ],
  );
}

function recipeGuides(): Guide[] {
  const out: Guide[] = [];
  for (const recipe of listCatalog().recipes) {
    const board = getCatalogPart(recipe.boardIds[0]);
    const mod = getCatalogPart(recipe.moduleIds[0]);
    if (!board || !mod) continue;
    const ground = board.pins.find((pin) => pin.kinds.includes("ground"));
    const power = board.pins.find((pin) => pin.kinds.includes("power"));
    const wires: [string, string, string, string][] = [];
    for (const pin of mod.pins) {
      const target = pin.kinds.includes("ground") ? ground : pin.kinds.includes("power") ? power : board.pins[0];
      if (target) wires.push(["mcu", target.id, "mod", pin.id]);
    }
    out.push(guide([["mcu", board.id], ["mod", mod.id]], wires));
  }
  return out;
}

function render(g: Guide, props: Partial<Parameters<typeof SchematicDiagram>[0]> = {}) {
  return renderToStaticMarkup(<SchematicDiagram guide={g} {...props} />);
}

describe("SchematicDiagram", () => {
  it("renders every recipe without throwing", () => {
    const guides = recipeGuides();
    expect(guides.length).toBeGreaterThan(5);
    for (const g of guides) {
      const html = render(g);
      expect(html).toContain("<svg");
      expect(html).toContain("aria-label=\"Circuit schematic\"");
      expect(html).toContain("Fit the whole picture on screen");
      expect(html).toContain("diagram-viewport");
    }
  });

  it("shows reference designators and value text", () => {
    const html = render(ledGuide());
    expect(html).toContain(">R1<");
    expect(html).toContain(">D1<");
    expect(html).toContain("220 ohm");
    expect(html).toContain("U1");
  });

  it("gives each part an accessible name that says what it connects to", () => {
    const html = render(ledGuide());
    expect(html).toMatch(/aria-label="Resistor R1, 220 ohm, connected to [^"]*D4/);
    expect(html).toContain("role=\"button\"");
    expect(html).toContain("tabindex=\"0\"");
  });

  it("dims wires and parts that are not focused", () => {
    const g = twoLedGuide();
    const layout = layoutSchematic(g);
    const html = render(g, { focusedWireIds: ["c1"] });
    expect(html).toContain("opacity=\"0.12\"");
    expect(html).toContain("opacity=\"0.55\"");
    const focusedWire = layout.wires.find((wire) => wire.connectionId === "c1");
    expect(focusedWire).toBeTruthy();
    expect(html).toMatch(/<g opacity="1"[^>]*data-wire="c1"/);
    expect(html).toMatch(/<g opacity="0.12"[^>]*data-wire="c3"/);
  });

  it("matches a focused wire to any connection of its net", () => {
    const g = guide(
      [
        ["mcu", ESP],
        ["bb", "passive.breadboard.half"],
        ["led", "passive.led.red"],
      ],
      [
        ["mcu", "D4", "bb", "a5"],
        ["bb", "b5", "led", "A"],
      ],
    );
    const layout = layoutSchematic(g);
    expect(layout.wires.map((wire) => wire.connectionId)).toEqual(["c2"]);
    const html = render(g, { focusedWireIds: ["c1"] });
    expect(html).toMatch(/<g opacity="1"[^>]*data-wire="c2"/);
  });

  it("hides unfocused wires when asked", () => {
    const html = render(twoLedGuide(), { focusedWireIds: ["c1"], hideUnfocused: true });
    expect(html).not.toContain("data-wire=\"c3\"");
  });

  it("shows the empty message for a guide without parts", () => {
    const html = render(guide([], []));
    expect(html).toContain("Add parts to render the schematic.");
    expect(html).not.toContain("<svg");
  });

  it("lists the symbols used in the legend", () => {
    const html = render(ledGuide());
    expect(html).toContain("Symbols in this guide");
    expect(html).toContain("Resistor.");
    expect(html).toContain("LED.");
    expect(html).toContain("Boxes with pin names are boards and modules.");
    expect(html).not.toContain("Battery.");
    const legend = html.slice(html.indexOf("schematic-legend"));
    const listClose = legend.indexOf("</ul>");
    expect(listClose).toBeGreaterThan(0);
    expect(legend.indexOf("Resistor.")).toBeLessThan(listClose);
    expect(legend.indexOf("Boxes with pin names are boards and modules.")).toBeGreaterThan(listClose);
    expect(legend).toMatch(/<ol[^>]*>[\s\S]*Boxes with pin names are boards and modules\./);
    expect(legend).toContain("rounded-full");
    expect(legend).toContain("border-copper");
    const withBreadboard = render(
      guide(
        [
          ["mcu", ESP],
          ["bb", "passive.breadboard.half"],
        ],
        [["mcu", "D4", "bb", "a5"]],
      ),
    );
    const breadboardLegend = withBreadboard.slice(withBreadboard.indexOf("schematic-legend"));
    const breadboardList = breadboardLegend.slice(0, breadboardLegend.indexOf("</ul>"));
    expect(breadboardList).not.toContain("The breadboard is left out.");
    expect(breadboardLegend.indexOf("The breadboard is left out. It only joins wires together.")).toBeGreaterThan(
      breadboardLegend.indexOf("</ul>"),
    );
  });

  it("keeps legend glyphs separate from the circuit drawing", () => {
    const html = render(
      guide(
        [
          ["mcu", ESP],
          ["sw", "passive.pushbutton"],
        ],
        [
          ["mcu", "D4", "sw", "1.l"],
          ["sw", "2.l", "mcu", "GND.1"],
        ],
      ),
    );
    const legendAt = html.indexOf("schematic-legend");
    expect(legendAt).toBeGreaterThan(0);
    const drawing = html.slice(0, legendAt);
    const legend = html.slice(legendAt);
    expect(drawing).toContain("schematic-canvas");
    expect(drawing).not.toContain("symbol-preview");
    expect(legend).toContain("symbol-preview");
    expect(legend).toContain("w-14");
    expect(legend).not.toContain("schematic-canvas");
    expect(legend).toContain("Push button.");
    expect(legend).toContain("Joins two sides of the circuit while you press it and lets go when you release.");
    expect(legend).toContain("Boxes with pin names are boards and modules.");
    expect(html).toContain("schematic-caption");
    expect(html).toContain("Hover, tap or tab to a part or wire to see what it does.");
    expect(html).toMatch(/schematic-caption[^"]*py-1\.5/);
    expect(html).not.toMatch(/schematic-caption[^"]*min-h-\[3\.25rem\]/);
    expect(html).toContain("diagram-toolbar");
    expect(html).toContain("Fit the whole picture on screen");
  });

  it("explains the hovered wire in the caption", () => {
    const html = render(ledGuide(), { hoveredWireId: "c1" });
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("Signal wire");
    expect(html).toMatch(/schematic-caption[^"]*min-h-\[3\.25rem\]/);
  });

  it("warns when the circuit is too big", () => {
    const parts: [string, string][] = [["mcu", ESP]];
    const wires: [string, string, string, string][] = [];
    for (let i = 0; i < 9; i++) {
      parts.push([`r${i}`, "passive.resistor.220"]);
      wires.push(["mcu", "D4", `r${i}`, "1"]);
    }
    const html = render(guide(parts, wires));
    expect(html).toContain("This circuit is big");
  });
});
