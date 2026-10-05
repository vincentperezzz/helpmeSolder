import { describe, expect, it } from "vitest";
import { listCatalog } from "@/lib/catalog";
import type { CatalogPart } from "@/lib/catalog/types";
import {
  basicCategory,
  boardFamily,
  buildCoverage,
  moduleCategory,
  percentOf,
} from "./coverage";

const part = (id: string, extra: Partial<CatalogPart> = {}): CatalogPart => ({
  id,
  name: id,
  kind: "module",
  description: "",
  pins: [],
  ...extra,
});

describe("coverage helpers", () => {
  it("derives families and categories", () => {
    expect(boardFamily("board.arduino.uno")).toBe("Arduino");
    expect(boardFamily("board.pico.w")).toBe("Raspberry Pi Pico");
    expect(boardFamily("board.pi.4b")).toBe("Raspberry Pi");
    expect(boardFamily("board.esp32.devkit")).toBe("ESP");
    expect(moduleCategory("module.lcd.i2c.1602")).toBe("Displays");
    expect(moduleCategory("module.dht22")).toBe("Sensors");
    expect(moduleCategory("module.servo")).toBe("Motors, relays and sound output");
    expect(basicCategory("passive.power.battery.9v")).toBe("Power sources");
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe("buildCoverage", () => {
  it("flags missing images from an injected catalog", () => {
    const report = buildCoverage({
      boards: [
        part("board.arduino.uno", {
          photoHint: "arduino-uno",
          wokwi: { tag: "wokwi-arduino-uno" },
          electrical: { logic: "5v" },
        }),
      ],
      modules: [part("module.mystery", { photoHint: "nope-not-real" })],
      passives: [],
      recipes: [],
    });
    expect(report.boards[0]).toMatchObject({ logic: "5 V", hasDrawing: true, hasThumbnail: true });
    expect(report.modules[0]).toMatchObject({
      logic: "unknown",
      hasDrawing: false,
      hasThumbnail: false,
    });
    expect(report.missing.map((r) => r.id)).toEqual(["module.mystery"]);
    expect(report.percent).toEqual({ drawing: 50, thumbnail: 50 });
  });

  it("is consistent for the real catalog", () => {
    const catalog = listCatalog();
    const report = buildCoverage(catalog);
    expect(report.boards).toHaveLength(catalog.boards.length);
    expect(report.total).toBe(
      catalog.boards.length + catalog.modules.length + catalog.passives.length,
    );
    expect(report.moduleGroups.flatMap((g) => g.rows)).toHaveLength(catalog.modules.length);
    expect(report.percent.drawing).toBeGreaterThanOrEqual(0);
    expect(report.percent.thumbnail).toBeLessThanOrEqual(100);
  });
});
