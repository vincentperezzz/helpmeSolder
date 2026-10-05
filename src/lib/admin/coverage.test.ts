import { describe, expect, it } from "vitest";
import { listCatalog } from "@/lib/catalog";
import type { CatalogPart } from "@/lib/catalog/types";
import {
  hasBuiltInDrawing,
  basicCategory,
  boardFamily,
  CATEGORIES,
  buildCoverage,
  categoryOf,
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

describe("categories", () => {
  const report = buildCoverage();
  const byId = (id: string) => report.categories.find((c) => c.id === id)!;

  it("puts every part in exactly one category", () => {
    const ids = report.categories.flatMap((c) => c.rows.map((r) => r.id));
    expect(ids).toHaveLength(report.total);
    expect(new Set(ids).size).toBe(report.total);
    expect(report.categories.reduce((n, c) => n + c.count, 0)).toBe(report.total);
  });

  it("assigns spot checks", () => {
    const where = (id: string) => report.categories.find((c) => c.rows.some((r) => r.id === id))?.label;
    expect(where("board.esp32.devkit")).toBe("Microcontrollers");
    expect(where("board.pi.4b")).toBe("Microcontrollers");
    expect(where("passive.resistor.220")).toBe("Resistors");
    expect(where("module.photoresistor")).toBe("Sensors");
    expect(where("module.microsd")).toBe("Storage and time");
    expect(where("passive.power.battery.9v")).toBe("Power");
    expect(where("passive.led.red")).toBe("Lights");
    expect(where("module.neopixel")).toBe("Lights");
    expect(where("passive.pushbutton")).toBe("Inputs");
    expect(where("passive.potentiometer")).toBe("Inputs");
    expect(where("module.servo")).toBe("Motors and relays");
    expect(where("passive.breadboard.half")).toBe("Other basic parts");
  });

  it("sends unknown future parts to other", () => {
    expect(categoryOf("module", "module.future.thing")).toBe("other");
    expect(categoryOf("passive", "passive.capacitor.100n")).toBe("other");
  });

  it("computes per-category coverage", () => {
    const r = buildCoverage({
      boards: [],
      modules: [
        part("module.dht22", { photoHint: "nope" }),
        part("module.pir.motion", { photoHint: "nope", wokwi: { tag: "wokwi-pir-motion-sensor" } }),
      ],
      passives: [],
      recipes: [],
    });
    const sensors = r.categories.find((c) => c.id === "sensors")!;
    expect(sensors).toMatchObject({ count: 2, drawings: 1, thumbnails: 0, missing: 2 });
    expect(sensors.percent).toEqual({ drawing: 50, thumbnail: 0 });
    expect(r.categories.find((c) => c.id === "displays")).toMatchObject({ count: 0, missing: 0 });
  });

  it("has unique url-safe anchor ids", () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(byId("microcontrollers").count).toBe(listCatalog().boards.length);
  });
});

describe("built-in drawings", () => {
  it("counts power sources and the breadboard as drawn", () => {
    expect(hasBuiltInDrawing("passive.power.battery.9v")).toBe(true);
    expect(hasBuiltInDrawing("passive.power.usb_wall")).toBe(true);
    expect(hasBuiltInDrawing("passive.breadboard.half")).toBe(true);
    expect(hasBuiltInDrawing("module.dht22")).toBe(false);
  });

  it("reports no catalog part as missing a drawing or thumbnail", () => {
    const report = buildCoverage();
    expect(report.missing.map((row) => row.id)).toEqual([]);
  });
});
