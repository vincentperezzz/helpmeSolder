import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PRINT_OPTIONS,
  readPrintOptions,
  readPrintSchematic,
  readView,
  writePrintOptions,
  writePrintSchematic,
  writeView,
} from "./view-storage";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("view storage", () => {
  let storage: ReturnType<typeof fakeStorage>;

  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to real parts", () => {
    expect(readView("g1")).toBe("parts");
  });

  it("remembers the schematic per guide", () => {
    writeView("g1", "schematic");
    expect(readView("g1")).toBe("schematic");
    expect(readView("g2")).toBe("parts");
  });

  it("clears the saved value when going back to real parts", () => {
    writeView("g1", "schematic");
    writeView("g1", "parts");
    expect(storage.data.size).toBe(0);
    expect(readView("g1")).toBe("parts");
  });

  it("ignores junk values", () => {
    storage.setItem("helpmesolder:circuit-view:g1", "nonsense");
    expect(readView("g1")).toBe("parts");
  });

  it("remembers the print choice per guide, off by default", () => {
    expect(readPrintSchematic("g1")).toBe(false);
    writePrintSchematic("g1", true);
    expect(readPrintSchematic("g1")).toBe(true);
    expect(readPrintSchematic("g2")).toBe(false);
    writePrintSchematic("g1", false);
    expect(readPrintSchematic("g1")).toBe(false);
  });

  it("stores full print section options", () => {
    expect(readPrintOptions("g1")).toEqual(DEFAULT_PRINT_OPTIONS);
    writePrintOptions("g1", { ...DEFAULT_PRINT_OPTIONS, steps: false, schematic: true });
    expect(readPrintOptions("g1").steps).toBe(false);
    expect(readPrintOptions("g1").schematic).toBe(true);
    expect(readPrintOptions("g2").steps).toBe(true);
  });

  it("migrates the legacy schematic flag into options", () => {
    storage.setItem("helpmesolder:print-schematic:g1", "on");
    expect(readPrintOptions("g1").schematic).toBe(true);
    expect(readPrintOptions("g1").parts).toBe(true);
  });

  it("survives blocked storage", () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        throw new Error("blocked");
      },
    });
    expect(readView("g1")).toBe("parts");
    expect(readPrintSchematic("g1")).toBe(false);
    expect(readPrintOptions("g1")).toEqual(DEFAULT_PRINT_OPTIONS);
    expect(() => writeView("g1", "schematic")).not.toThrow();
    expect(() => writePrintSchematic("g1", true)).not.toThrow();
    expect(() => writePrintOptions("g1", DEFAULT_PRINT_OPTIONS)).not.toThrow();
  });
});
