import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PRINT_OPTIONS,
  PRINT_GROUPS,
  PRINT_PICTURE_WIDTH,
  PRINT_SECTIONS,
  printContentWidthMm,
  printPageWidthMm,
  printPictureWidth,
  readPrintOptions,
  readPrintPaper,
  readPrintSchematic,
  readView,
  setAllPrintOptions,
  writePrintOptions,
  writePrintPaper,
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

  it("lists every print section in exactly one group", () => {
    const grouped = PRINT_GROUPS.flatMap((group) => group.sections);
    expect([...grouped].sort()).toEqual([...PRINT_SECTIONS].sort());
  });

  it("selects or clears every print section", () => {
    expect(Object.values(setAllPrintOptions(true)).every(Boolean)).toBe(true);
    expect(Object.values(setAllPrintOptions(false)).some(Boolean)).toBe(false);
    expect(Object.keys(setAllPrintOptions(false)).sort()).toEqual([...PRINT_SECTIONS].sort());
  });

  it("remembers the paper size per guide, letter by default", () => {
    expect(readPrintPaper("g1")).toBe("letter");
    writePrintPaper("g1", "a4");
    expect(readPrintPaper("g1")).toBe("a4");
    expect(readPrintPaper("g2")).toBe("letter");
    writePrintPaper("g1", "long");
    expect(readPrintPaper("g1")).toBe("long");
    expect(storage.data.get("helpmesolder:print-paper:g1")).toBe("long");
    writePrintPaper("g1", "letter");
    expect(readPrintPaper("g1")).toBe("letter");
    expect(storage.data.has("helpmesolder:print-paper:g1")).toBe(false);
  });

  it("ignores junk paper sizes", () => {
    storage.setItem("helpmesolder:print-paper:g1", "legal");
    expect(readPrintPaper("g1")).toBe("letter");
    storage.setItem("helpmesolder:print-paper:g1", "short");
    expect(readPrintPaper("g1")).toBe("letter");
  });

  it("fits the picture to each paper's content width, with letter as the baseline", () => {
    expect(printPictureWidth("letter")).toBe(PRINT_PICTURE_WIDTH);
    expect(printPictureWidth("long")).toBe(printPictureWidth("letter"));
    expect(printContentWidthMm("long")).toBe(printContentWidthMm("letter"));
    expect(printPageWidthMm("letter")).toBeCloseTo(8.5 * 25.4, 8);
    expect(printPageWidthMm("long")).toBe(printPageWidthMm("letter"));
    expect(printPageWidthMm("a4")).toBe(210);
    expect(printContentWidthMm("letter")).toBeCloseTo(8.5 * 25.4 - 24, 8);
    expect(printContentWidthMm("a4")).toBe(210 - 24);
    expect(printPictureWidth("a4")).toBeLessThan(PRINT_PICTURE_WIDTH);
    expect(printPictureWidth("a4") / printPictureWidth("letter")).toBeCloseTo(
      printContentWidthMm("a4") / printContentWidthMm("letter"),
      10,
    );
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
    expect(readPrintPaper("g1")).toBe("letter");
    expect(() => writeView("g1", "schematic")).not.toThrow();
    expect(() => writePrintSchematic("g1", true)).not.toThrow();
    expect(() => writePrintOptions("g1", DEFAULT_PRINT_OPTIONS)).not.toThrow();
    expect(() => writePrintPaper("g1", "a4")).not.toThrow();
  });
});
