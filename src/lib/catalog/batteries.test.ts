import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BATTERY_ASSETS, BATTERY_ELECTRICAL, batteryRecordForPart } from "./batteries";
import { BATTERY_RECORD_LIST } from "./battery-records";
import { getCatalogPart } from "./index";
import { resolvePartPhoto } from "./part-media";
import { passives } from "./passives";

const PUBLIC = path.join(process.cwd(), "public");

type Shape = { kind: "rect"; x: number; y: number; w: number; h: number } | { kind: "circle"; cx: number; cy: number; r: number };

function attr(tag: string, name: string): number {
  const match = new RegExp(`\\s${name}="([-0-9.]+)"`).exec(tag);
  if (!match) throw new Error(`${name} missing in ${tag}`);
  return Number(match[1]);
}

function shapeById(svg: string, id: string): Shape | null {
  const tag = new RegExp(`<(rect|circle)\\b[^>]*\\bid="${id}"[^>]*>`).exec(svg);
  if (!tag) return null;
  if (tag[1] === "circle") {
    return { kind: "circle", cx: attr(tag[0], "cx"), cy: attr(tag[0], "cy"), r: attr(tag[0], "r") };
  }
  return { kind: "rect", x: attr(tag[0], "x"), y: attr(tag[0], "y"), w: attr(tag[0], "width"), h: attr(tag[0], "height") };
}

/** True when the wire anchor lies on the terminal shape (2 px slack for the stroke). */
function anchorOnShape(shape: Shape, p: { x: number; y: number }): boolean {
  const slack = 2;
  if (shape.kind === "circle") return Math.hypot(p.x - shape.cx, p.y - shape.cy) <= shape.r + slack;
  return (
    p.x >= shape.x - slack &&
    p.x <= shape.x + shape.w + slack &&
    p.y >= shape.y - slack &&
    p.y <= shape.y + shape.h + slack
  );
}

describe("battery table", () => {
  it("derives electrical and asset records for every battery", () => {
    for (const record of BATTERY_RECORD_LIST) {
      expect(BATTERY_ELECTRICAL[record.id as keyof typeof BATTERY_ELECTRICAL]).toMatchObject({
        nominal: record.nominal,
        min: record.min,
        max: record.max,
        chemistry: record.chemistry,
      });
      expect(BATTERY_ASSETS[record.id as keyof typeof BATTERY_ASSETS]).toMatchObject({
        width: record.width,
        height: record.height,
        src: record.asset,
      });
    }
  });

  it("keeps the original four ids and voltages", () => {
    expect(BATTERY_ELECTRICAL.battery_9v).toMatchObject({ nominal: 9, min: 6, max: 9.6, chemistry: "alkaline" });
    expect(BATTERY_ELECTRICAL.battery_2aa).toMatchObject({ nominal: 3, min: 2, max: 3.2 });
    expect(BATTERY_ELECTRICAL.battery_3aa).toMatchObject({ nominal: 4.5, min: 3, max: 4.8 });
    expect(BATTERY_ELECTRICAL.battery_18650).toMatchObject({ nominal: 3.7, min: 3, max: 4.2, chemistry: "li-ion" });
  });

  it("generates one catalog part per record with + and - pins and a supply on +", () => {
    for (const record of BATTERY_RECORD_LIST) {
      const part = getCatalogPart(record.partId);
      expect(part, record.id).toBeDefined();
      expect(batteryRecordForPart(record.partId)?.id).toBe(record.id);
      expect(part!.pins.map((p) => p.id)).toEqual(["+", "-"]);
      expect(part!.pins[0].kinds).toContain("power");
      expect(part!.pins[1].kinds).toContain("ground");
      const source = part!.electrical?.pins?.["+"]?.source;
      expect(source, record.id).toMatchObject({
        nominal: record.nominal,
        min: record.min,
        max: record.max,
        external: true,
      });
    }
    expect(passives.filter((p) => p.id.startsWith("passive.power.")).length).toBe(BATTERY_RECORD_LIST.length + 2);
  });

  it("flags the coin cell as low current", () => {
    expect(getCatalogPart("passive.power.battery.cr2032")?.electrical?.battery?.lowCurrent).toBe(true);
    expect(getCatalogPart("passive.power.battery.4aa")?.electrical?.battery?.lowCurrent).toBeUndefined();
  });

  it("has a power bank with a USB 5 V supply pin", () => {
    const bank = getCatalogPart("passive.power.power_bank");
    expect(bank?.electrical?.pins?.["5V"]?.source).toMatchObject({ nominal: 5, external: true });
  });
});

describe("battery artwork", () => {
  for (const record of BATTERY_RECORD_LIST) {
    it(`${record.id}: SVG exists, is clean, and the wire anchors sit on the + and - terminals`, () => {
      const file = path.join(PUBLIC, record.asset);
      expect(existsSync(file), record.asset).toBe(true);
      const svg = readFileSync(file, "utf8");

      // No control characters, scripts, embedded rasters or external references.
      expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(svg)).toBe(false);
      expect(svg).not.toMatch(/<script|<image|href=|xlink:/i);

      const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
      expect(viewBox, "viewBox").not.toBeNull();
      expect(Number(viewBox![1])).toBe(record.width);
      expect(Number(viewBox![2])).toBe(record.height);

      const plus = shapeById(svg, "term-plus");
      const minus = shapeById(svg, "term-minus");
      expect(plus, "term-plus").not.toBeNull();
      expect(minus, "term-minus").not.toBeNull();
      expect(anchorOnShape(plus!, record.terminals.plus), `${record.id} + anchor`).toBe(true);
      expect(anchorOnShape(minus!, record.terminals.minus), `${record.id} - anchor`).toBe(true);

      // Anchors stay inside the drawing and wire exits are unit steps.
      for (const p of [record.terminals.plus, record.terminals.minus]) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(record.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(record.height);
      }
      for (const exit of [record.terminals.plusExit, record.terminals.minusExit]) {
        expect(Math.abs(exit.dx) + Math.abs(exit.dy)).toBe(1);
      }
      // Plus and minus are different spots.
      expect(record.terminals.plus).not.toEqual(record.terminals.minus);
    });
  }

  it("has a thumbnail for every power part, with generic text only (no brand logos)", () => {
    const hints = [
      ...BATTERY_RECORD_LIST.map((r) => r.photoHint),
      "power-bank",
    ];
    for (const hint of hints) {
      const url = resolvePartPhoto(hint);
      expect(url, hint).not.toBeNull();
      const file = path.join(PUBLIC, url!);
      expect(existsSync(file), url!).toBe(true);
      const svg = readFileSync(file, "utf8");
      expect(svg.length).toBeGreaterThan(500);
      expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(svg)).toBe(false);
      expect(svg).toContain("(CC0)");
      expect(svg.toLowerCase()).not.toMatch(/duracell|energizer|eneloop|panasonic|varta|sony|samsung/);
    }
  });
});
