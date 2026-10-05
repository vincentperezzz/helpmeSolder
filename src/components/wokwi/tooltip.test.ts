import { describe, expect, it } from "vitest";
import { getCatalogPart } from "@/lib/catalog";
import { placeTooltip, partTooltip, tooltipLabel, wireTooltip } from "./tooltip";

describe("wireTooltip", () => {
  it("uses the checklist sentence plus the colour name", () => {
    const t = wireTooltip(
      { sentence: "Alarm, pin 1 (SIG) to ESP32 DevKit V1, pin D13", why: "Signal: x" },
      "fallback",
      "#c62828",
    );
    expect(t.title).toBe("Alarm, pin 1 (SIG) to ESP32 DevKit V1, pin D13 (red wire)");
    expect(t.detail).toBe("Signal: x");
  });
  it("falls back to the given title and names the new palette colours", () => {
    expect(wireTooltip(undefined, "2xAA cells + to VIN", "#795548").title).toBe(
      "2xAA cells + to VIN (brown wire)",
    );
  });
});

describe("partTooltip", () => {
  it("prefers the guide label, never the instance id, and adds a type tag", () => {
    const catalog = getCatalogPart("module.buzzer.active") ?? getCatalogPart("board.esp32.devkit");
    const t = partTooltip("Alarm", catalog, "internal-id-7");
    expect(t.title).toBe("Alarm");
    expect(t.tag).toBeTruthy();
    expect(tooltipLabel(t)).not.toContain("internal-id-7");
  });
  it("falls back to the catalog name", () => {
    const catalog = getCatalogPart("board.esp32.devkit");
    expect(partTooltip(undefined, catalog, "x").title).toBe(catalog?.name ?? "x");
  });
});

describe("placeTooltip", () => {
  const vp = { w: 800, h: 600 };
  it("sits beside the pointer and flips near the right and bottom edges", () => {
    expect(placeTooltip({ x: 100, y: 100 }, { w: 200, h: 80 }, vp)).toEqual({ left: 114, top: 114 });
    const flipped = placeTooltip({ x: 790, y: 590 }, { w: 200, h: 80 }, vp);
    expect(flipped.left + 200).toBeLessThanOrEqual(792);
    expect(flipped.top + 80).toBeLessThanOrEqual(592);
  });
  it("never leaves the viewport", () => {
    const p = placeTooltip({ x: 0, y: 0 }, { w: 900, h: 700 }, vp);
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.top).toBeGreaterThanOrEqual(8);
  });
});
