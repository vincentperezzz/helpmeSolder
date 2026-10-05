import { describe, expect, it } from "vitest";
import { explainNet, explainSymbol, symbolMeaning, symbolName } from "./explain";
import type { SymbolKind } from "./types";

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

describe("explainSymbol", () => {
  it.each(KINDS)("has beginner text for %s", (kind) => {
    const { title, body } = explainSymbol(kind, "");
    expect(title.length).toBeGreaterThan(2);
    expect(body.length).toBeGreaterThan(20);
    expect(body).not.toContain("—");
    expect(symbolName(kind)).toBe(title);
    expect(symbolMeaning(kind).endsWith(".")).toBe(true);
  });

  it("adds the value to the title", () => {
    expect(explainSymbol("resistor", "220 ohm").title).toBe("Resistor, 220 ohm");
    expect(explainSymbol("resistor", "").title).toBe("Resistor");
  });

  it("says a resistor has no polarity", () => {
    expect(explainSymbol("resistor", "").body).toContain("no polarity");
  });
});

describe("explainNet", () => {
  it("explains each net kind", () => {
    expect(explainNet({ kind: "ground", label: "GND" }).title).toContain("Ground");
    expect(explainNet({ kind: "power", label: "3V3" }).body).toContain("3V3");
    expect(explainNet({ kind: "signal", label: "D4" }).title).toContain("D4");
    expect(explainNet({ kind: "signal", label: "" }).title).toBe("Signal wire");
  });
});
