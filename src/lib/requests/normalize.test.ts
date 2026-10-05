import { describe, expect, it } from "vitest";
import { STRONG_MATCH, normalizePartKey, suggestClosest } from "./normalize";

describe("normalizePartKey", () => {
  it("lowercases, strips prefixes and separators", () => {
    expect(normalizePartKey("module.DHT22")).toBe("dht22");
    expect(normalizePartKey("DHT 22")).toBe("dht22");
    expect(normalizePartKey("board.esp32.devkit")).toBe("esp32devkit");
    expect(normalizePartKey("passive.resistor.220")).toBe("resistor220");
    expect(normalizePartKey("HC-SR04!!")).toBe("hcsr04");
  });
  it("caps at 80 chars and returns null for empty", () => {
    expect(normalizePartKey("a".repeat(200))).toHaveLength(80);
    expect(normalizePartKey("  --  ")).toBeNull();
    expect(normalizePartKey("")).toBeNull();
  });
});

describe("suggestClosest", () => {
  it("finds the esp32 devkit", () => {
    const [top] = suggestClosest("esp32 devkit");
    expect(top.id).toBe("board.esp32.devkit");
    expect(top.score).toBeGreaterThanOrEqual(STRONG_MATCH);
  });
  it("finds DHT22 and HC-SR04 despite spacing", () => {
    expect(suggestClosest("DHT 22")[0].id).toBe("module.dht22");
    expect(suggestClosest("HC-SR04")[0].id).toBe("module.hc-sr04");
  });
  it("has no strong match for a part we do not have", () => {
    for (const hit of suggestClosest("BME280")) {
      expect(hit.score).toBeLessThan(STRONG_MATCH);
    }
  });
  it("returns nothing for unrelated or empty queries", () => {
    expect(suggestClosest("zorblax quantum flux capacitor")).toEqual([]);
    expect(suggestClosest("")).toEqual([]);
  });
  it("respects the limit and is deterministic", () => {
    const a = suggestClosest("led", 3);
    expect(a.length).toBeLessThanOrEqual(3);
    expect(suggestClosest("led", 3)).toEqual(a);
  });
});
