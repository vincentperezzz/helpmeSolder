import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCatalogPart, listCatalog } from "@/lib/catalog";
import type { SymbolKind } from "@/lib/schematic/types";
import { GroundFlag, PowerFlag, SchematicSymbol, getSymbolKind, getSymbolSpec } from "./index";

const KINDS: SymbolKind[] = [
  "resistor",
  "led",
  "potentiometer",
  "pushbutton",
  "battery",
  "usb-supply",
  "capacitor",
  "diode",
  "block",
];

const SIGNAL_KINDS = ["digital", "analog", "i2c", "spi", "uart"];

function esp32() {
  const part = getCatalogPart("board.esp32.devkit");
  if (!part) throw new Error("esp32 board missing");
  return part;
}

function passives() {
  return listCatalog().passives;
}

describe("getSymbolKind", () => {
  it("maps passives", () => {
    expect(getSymbolKind("passive.resistor.220")).toBe("resistor");
    expect(getSymbolKind("passive.resistor.10k")).toBe("resistor");
    expect(getSymbolKind("passive.led.red")).toBe("led");
    expect(getSymbolKind("passive.led.green")).toBe("led");
    expect(getSymbolKind("passive.potentiometer")).toBe("potentiometer");
    expect(getSymbolKind("passive.pushbutton")).toBe("pushbutton");
  });

  it("maps power sources", () => {
    expect(getSymbolKind("passive.power.usb_wall")).toBe("usb-supply");
    expect(getSymbolKind("passive.power.power_bank")).toBe("usb-supply");
    expect(getSymbolKind("passive.power.supply.barrel_9v")).toBe("usb-supply");
  });

  it("maps every generated battery part to battery", () => {
    const batteries = passives().filter((p) => p.id.startsWith("passive.power.battery."));
    expect(batteries.length).toBeGreaterThan(0);
    for (const part of batteries) expect(getSymbolKind(part.id, part)).toBe("battery");
  });

  it("falls back to block for boards, modules and unknown ids", () => {
    expect(getSymbolKind("board.esp32.devkit")).toBe("block");
    expect(getSymbolKind("module.dht22")).toBe("block");
    expect(getSymbolKind("passive.breadboard.half")).toBe("block");
    expect(getSymbolKind("nothing")).toBe("block");
  });
});

describe("getSymbolSpec", () => {
  it.each(KINDS)("has a spec for %s", (kind) => {
    const spec = getSymbolSpec(kind, kind === "block" ? esp32() : undefined);
    expect(spec.kind).toBe(kind);
    expect(spec.width).toBeGreaterThan(0);
    expect(spec.height).toBeGreaterThan(0);
    expect(Object.keys(spec.pins).length).toBeGreaterThan(0);
  });

  it.each(KINDS)("keeps %s pins on the bounding box edge", (kind) => {
    const spec = getSymbolSpec(kind, kind === "block" ? esp32() : undefined);
    for (const [id, pin] of Object.entries(spec.pins)) {
      expect(pin.x, id).toBeGreaterThanOrEqual(0);
      expect(pin.x, id).toBeLessThanOrEqual(spec.width);
      expect(pin.y, id).toBeGreaterThanOrEqual(0);
      expect(pin.y, id).toBeLessThanOrEqual(spec.height);
      const onEdge =
        (pin.side === "left" && pin.x === 0) ||
        (pin.side === "right" && pin.x === spec.width) ||
        (pin.side === "top" && pin.y === 0) ||
        (pin.side === "bottom" && pin.y === spec.height);
      expect(onEdge, id).toBe(true);
    }
  });

  it("keys fixed specs by the real catalog pin ids", () => {
    const parts = passives().filter((p) => getSymbolKind(p.id, p) !== "block");
    expect(parts.length).toBeGreaterThan(5);
    for (const part of parts) {
      const spec = getSymbolSpec(getSymbolKind(part.id, part), part);
      expect(Object.keys(spec.pins).sort(), part.id).toEqual(part.pins.map((p) => p.id).sort());
    }
  });

  it("covers every pin of an ESP32 block with power top and ground bottom", () => {
    const part = esp32();
    const spec = getSymbolSpec("block", part);
    for (const pin of part.pins) {
      const anchor = spec.pins[pin.id];
      expect(anchor, pin.id).toBeDefined();
      const isSignal = pin.kinds.some((k) => SIGNAL_KINDS.includes(k));
      if (pin.kinds.includes("ground")) expect(anchor.side, pin.id).toBe("bottom");
      else if (pin.kinds.includes("power") && !isSignal) expect(anchor.side, pin.id).toBe("top");
      else expect(["left", "right"], pin.id).toContain(anchor.side);
    }
    const sides = new Set(Object.values(spec.pins).map((p) => p.side));
    expect(sides).toEqual(new Set(["top", "bottom", "left", "right"]));
  });

  it("spaces side pins at the fixed pitch", () => {
    const spec = getSymbolSpec("block", esp32());
    const ys = Object.values(spec.pins)
      .filter((p) => p.side === "left")
      .map((p) => p.y)
      .sort((a, b) => a - b);
    expect(ys.length).toBeGreaterThan(1);
    for (let i = 1; i < ys.length; i += 1) expect(ys[i] - ys[i - 1]).toBe(18);
  });
});

describe("rendering", () => {
  it.each(KINDS)("renders %s as svg markup", (kind) => {
    const part = kind === "block" ? esp32() : undefined;
    const spec = getSymbolSpec(kind, part);
    const html = renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(SchematicSymbol, { spec, part, x: 5, y: 5, refDes: "X1", valueText: "v" }),
      ),
    );
    expect(html).toContain("currentColor");
    expect(html).toContain("X1");
    expect(html).toContain('transform="translate(5 5)"');
  });

  it("draws block title and pin names", () => {
    const part = esp32();
    const html = renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(SchematicSymbol, { spec: getSymbolSpec("block", part), part, x: 0, y: 0 }),
      ),
    );
    expect(html).toContain(part.pins[0].label);
    expect(html).toContain(part.name);
  });

  it("renders flags with labels", () => {
    const html = renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(GroundFlag, { x: 1, y: 2, label: "GND" }),
        createElement(PowerFlag, { x: 3, y: 4, label: "3V3" }),
      ),
    );
    expect(html).toContain("GND");
    expect(html).toContain("3V3");
  });
});
