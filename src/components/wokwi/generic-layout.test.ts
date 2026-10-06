import { describe, expect, it } from "vitest";
import {
  GP_NARROW_MIN_H,
  GP_NARROW_W,
  GP_ROW_H,
  GP_WIDE_W,
  clipLabel,
  genericPinLayout,
  primaryPinKind,
} from "./generic-layout";

const pins = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `P${i}`,
    label: `Pin ${i}`,
    kinds: ["digital" as const],
  }));

describe("genericPinLayout", () => {
  it("handles no pins", () => {
    const l = genericPinLayout({ pins: [] });
    expect(l.pads).toEqual([]);
    expect(l.width).toBe(GP_NARROW_W);
    expect(l.height).toBe(GP_NARROW_MIN_H);
    expect(genericPinLayout(undefined).pads).toHaveLength(0);
  });

  it("puts one to four pins on the left, picture beside", () => {
    for (const n of [1, 4]) {
      const l = genericPinLayout({ pins: pins(n) });
      expect(l.oneSide).toBe(true);
      expect(l.pads.every((p) => p.side === "left" && p.x === 0)).toBe(true);
      expect(l.pads.every((p) => p.exit.dx === -1)).toBe(true);
      expect(l.image.x).toBeGreaterThan(80);
    }
    const four = genericPinLayout({ pins: pins(4) }).pads;
    expect(four[1].y - four[0].y).toBe(GP_ROW_H);
  });

  it("splits by order into two columns with ceil(n/2) rows", () => {
    const l = genericPinLayout({ pins: pins(5) });
    expect(l.width).toBe(GP_WIDE_W);
    expect(l.pads.filter((p) => p.side === "left")).toHaveLength(3);
    expect(l.pads.filter((p) => p.side === "right")).toHaveLength(2);
    // first right pin sits level with first left pin
    expect(l.pads[3].y).toBe(l.pads[0].y);
    expect(l.pads[3].x).toBe(GP_WIDE_W);
    expect(l.pads[3].exit.dx).toBe(1);
  });

  it.each([30, 40])("keeps %i pins tidy inside the card", (n) => {
    const l = genericPinLayout({ pins: pins(n) });
    expect(l.pads).toHaveLength(n);
    const rows = Math.ceil(n / 2);
    expect(l.height).toBeGreaterThanOrEqual(l.head + rows * GP_ROW_H);
    for (const p of l.pads) {
      expect(p.y).toBeGreaterThan(l.head);
      expect(p.y).toBeLessThan(l.height);
    }
    expect(new Set(l.pads.map((p) => `${p.x},${p.y}`)).size).toBe(n);
  });

  it("is deterministic and keeps pad ids", () => {
    expect(genericPinLayout({ pins: pins(7) })).toEqual(genericPinLayout({ pins: pins(7) }));
    expect(genericPinLayout({ pins: pins(3) }).pads.map((p) => p.id)).toEqual(["P0", "P1", "P2"]);
  });

  it("prints the label, not the id, and clips long ones", () => {
    const l = genericPinLayout({
      pins: [{ id: "x", label: "A very long pin label indeed", kinds: [] }],
    });
    expect(l.pads[0].text).not.toBe("x");
    expect(l.pads[0].text.endsWith("…")).toBe(true);
    expect(l.pads[0].label).toBe("A very long pin label indeed");
    expect(clipLabel("short")).toBe("short");
  });
});

describe("primaryPinKind", () => {
  it("ranks power, ground and buses before plain digital", () => {
    expect(primaryPinKind(["digital", "power"])).toBe("power");
    expect(primaryPinKind(["digital", "i2c"])).toBe("i2c");
    expect(primaryPinKind(["ground"])).toBe("ground");
    expect(primaryPinKind([])).toBe("other");
  });
});
