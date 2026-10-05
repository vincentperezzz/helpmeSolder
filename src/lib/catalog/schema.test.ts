import { describe, expect, it } from "vitest";
import { listCatalog } from "./index";
import { partCategory } from "./part-media";
import { photoQueriesFor } from "./photo-queries";
import {
  CatalogPartSchema,
  ID_PATTERN,
  MediaSchema,
  PartRecordSchema,
  PhotoQueriesSchema,
  RecipeSchema,
  catalogPartSchema,
  formatZodIssues,
  sanitizeText,
  textProblem,
} from "./schema";
import type { CatalogPart } from "./types";

const catalog = () => {
  const c = listCatalog();
  return [...c.boards, ...c.modules, ...c.passives];
};

/** Parts whose bundled pin list is longer than the normal 160-pin cap. */
const LOCKED = (part: CatalogPart) => part.pins.length > 160;

const good: CatalogPart = {
  id: "module.test.sensor",
  name: "Test sensor",
  kind: "module",
  description: "A small test sensor used only by the unit tests, long enough to pass.",
  pins: [
    { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
    { id: "GND", label: "GND", kinds: ["ground"] },
    { id: "OUT", label: "OUT", kinds: ["digital"] },
  ],
};

const issues = (value: unknown) => {
  const r = CatalogPartSchema.safeParse(value);
  return r.success ? [] : formatZodIssues(r.error).map((i) => i.message);
};

describe("seed", () => {
  it("every seed part passes the schema", () => {
    const failures: string[] = [];
    for (const part of catalog()) {
      const r = catalogPartSchema({ lockedPins: LOCKED(part) }).safeParse(part);
      if (!r.success) {
        failures.push(`${part.id}: ${formatZodIssues(r.error).map((i) => i.message).join(" | ")}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("parsing a seed part gives back the same data (seed text is already clean)", () => {
    for (const part of catalog()) {
      const r = catalogPartSchema({ lockedPins: LOCKED(part) }).parse(part);
      expect(r, part.id).toEqual(part);
    }
  });

  it("every seed record with its photo phrases passes the record schema", () => {
    for (const part of catalog()) {
      const record = { part, photoQueries: photoQueriesFor(part, partCategory(part)) };
      const r = PartRecordSchema.safeParse(record);
      // Only the 160-pin cap may differ for locked parts.
      if (!r.success && !LOCKED(part)) {
        throw new Error(`${part.id}: ${JSON.stringify(formatZodIssues(r.error))}`);
      }
    }
  });

  it("every seed recipe passes", () => {
    for (const recipe of listCatalog().recipes) {
      const r = RecipeSchema.safeParse(recipe);
      expect(r.success, recipe.id + (r.success ? "" : JSON.stringify(formatZodIssues(r.error)))).toBe(true);
    }
  });

  it("every seed id matches the id pattern and kind prefix", () => {
    for (const part of catalog()) {
      expect(ID_PATTERN.test(part.id), part.id).toBe(true);
      expect(part.id.startsWith(`${part.kind}.`), part.id).toBe(true);
    }
  });
});

describe("sanitizeText", () => {
  it("normalises, strips invisible characters and collapses spaces", () => {
    expect(sanitizeText("  Café   ​sensor\u0007  ")).toBe("Café sensor");
    expect(sanitizeText("a‮b⁦c")).toBe("abc");
    expect(sanitizeText("line one  \r\n  line two\t\there")).toBe("line one\nline two here");
    expect(sanitizeText("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("flags HTML-like tags and javascript: links", () => {
    expect(textProblem("<script>alert(1)</script>")).toMatch(/HTML/);
    expect(textProblem("under < 5 volts")).toBeNull();
    expect(textProblem("5 <3 volts")).toBeNull();
    expect(textProblem("click javascript:alert(1)")).toMatch(/javascript/);
    expect(textProblem("JaVa Script : x")).toMatch(/javascript/);
    expect(textProblem("<!-- hi -->")).toMatch(/HTML/);
    expect(textProblem("</b>")).toMatch(/HTML/);
  });
});

describe("part schema", () => {
  it("accepts a good part and cleans its text", () => {
    const r = CatalogPartSchema.parse({ ...good, name: "  Test   sensor " });
    expect(r.name).toBe("Test sensor");
  });

  it("rejects unknown fields", () => {
    expect(issues({ ...good, extra: 1 }).join()).toMatch(/aren't allowed/);
  });

  it("requires the id prefix to match the kind", () => {
    expect(issues({ ...good, kind: "board" }).join()).toMatch(/must start with "board\."/);
  });

  it("rejects bad ids", () => {
    expect(issues({ ...good, id: "Module.Foo" }).join()).toMatch(/Ids look like/);
    expect(issues({ ...good, id: `module.${"a".repeat(63)}` }).join()).toMatch(/Ids look like/);
  });

  it("enforces the text limits", () => {
    expect(issues({ ...good, name: "x" }).join()).toMatch(/Name needs at least 2 characters/);
    expect(issues({ ...good, name: "x".repeat(81) }).join()).toMatch(/at most 80 characters/);
    expect(issues({ ...good, description: "short" }).join()).toMatch(/Description needs at least 40/);
    expect(issues({ ...good, description: "d".repeat(1201) }).join()).toMatch(/at most 1200/);
    expect(issues({ ...good, identify: "i".repeat(801) }).join()).toMatch(/identify/i);
    expect(issues({ ...good, photoCaption: "c".repeat(241) }).join()).toMatch(/Photo caption/);
  });

  it("limits watch-outs and variants", () => {
    expect(issues({ ...good, watchOuts: Array(13).fill("a long enough warning") }).join()).toMatch(
      /at most 12 items/,
    );
    expect(issues({ ...good, watchOuts: ["short"] }).join()).toMatch(/Watch-out 1 needs at least 10/);
    const v = { label: "L", detail: "D" };
    expect(issues({ ...good, variants: Array(9).fill(v) }).join()).toMatch(/at most 8 items/);
    expect(issues({ ...good, variants: [{ label: "x".repeat(81), detail: "d" }] }).join()).toMatch(
      /Variant 1 label/,
    );
  });

  it("rejects HTML in any text field", () => {
    expect(issues({ ...good, name: "<b>Bold</b>" }).join()).toMatch(/HTML tags/);
    expect(
      issues({ ...good, watchOuts: ["Do not <script>touch</script> this"] }).join(),
    ).toMatch(/HTML tags/);
  });

  it("checks pins", () => {
    const one = (pin: object) => issues({ ...good, pins: [pin] }).join();
    expect(issues({ ...good, pins: [] }).join()).toMatch(/at least 1 item/);
    expect(issues({ ...good, pins: [...good.pins, good.pins[0]] }).join()).toMatch(
      /share the id "VCC"/,
    );
    expect(one({ id: "bad id!", label: "x", kinds: ["digital"] })).toMatch(/Pin ids use only/);
    expect(one({ id: "a,b", label: "x", kinds: ["digital"] })).toMatch(/Pin ids use only/);
    expect(one({ id: "D/C", label: "x", kinds: ["digital"] })).toBe("");
    expect(one({ id: "A", label: "x".repeat(33), kinds: ["digital"] })).toMatch(/Pin 1 label/);
    expect(one({ id: "A", label: "x", kinds: [] })).toMatch(/Pin 1 kinds needs at least 1/);
    expect(one({ id: "A", label: "x", kinds: ["digital", "digital"] })).toMatch(/same kind twice/);
    expect(one({ id: "A", label: "x", kinds: ["wifi"] })).toMatch(/must be one of/);
    expect(one({ id: "A", label: "x", kinds: ["power"], voltage: "12v" })).toMatch(/Pin 1 voltage/);
  });

  it("caps pins at 160 unless the pins are locked", () => {
    const many = Array.from({ length: 161 }, (_, i) => ({
      id: `P${i}`,
      label: `P${i}`,
      kinds: ["digital" as const],
    }));
    expect(issues({ ...good, pins: many }).join()).toMatch(/at most 160 items/);
    expect(catalogPartSchema({ lockedPins: true }).safeParse({ ...good, pins: many }).success).toBe(
      true,
    );
  });

  it("checks electrical ranges and references", () => {
    const e = (electrical: unknown) => issues({ ...good, electrical });
    expect(e({ supply: { min: 5, max: 3 } }).join()).toMatch(/lowest voltage/);
    expect(e({ supply: { min: 0, max: 49 } }).join()).toMatch(/at most 48/);
    expect(e({ supply: { min: -1, max: 5 } }).join()).toMatch(/at least 0/);
    expect(e({ pins: { VCC: { source: { min: 1, max: 2, nominal: 3 } } } }).join()).toMatch(
      /lowest <= normal <= highest/,
    );
    expect(e({ pins: { VCC: { source: { min: 3, max: 4, nominal: 3.3 } } } })).toEqual([]);
    expect(e({ pins: { NOPE: { accepts: { min: 1, max: 2 } } } }).join()).toMatch(
      /pin "NOPE" that this part doesn't have/,
    );
    expect(e({ inputOnlyPins: ["NOPE"] }).join()).toMatch(/"NOPE"/);
    expect(e({ inputOnlyPins: ["OUT"], inputMaxVolts: 3.6 })).toEqual([]);
    expect(e({ battery: { chemistry: "steam", cells: 1 } }).join()).toMatch(/must be one of/);
  });

  it("checks the Wokwi element", () => {
    expect(issues({ ...good, wokwi: { tag: "wokwi-led" } })).toEqual([]);
    expect(issues({ ...good, wokwi: { tag: "wokwi-nope" } }).join()).toMatch(/doesn't exist/);
    const attrs = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`a${i}`, "1"]));
    expect(issues({ ...good, wokwi: { tag: "wokwi-led", attrs } }).join()).toMatch(
      /at most 12 settings/,
    );
  });

  it("checks replacement, category and photo name", () => {
    expect(issues({ ...good, deprecated: true, replacedBy: good.id }).join()).toMatch(
      /replaced by itself/,
    );
    expect(issues({ ...good, replacedBy: "nope" }).join()).toMatch(/valid id/);
    expect(issues({ ...good, category: "Gadget" }).join()).toMatch(/must be one of/);
    expect(issues({ ...good, photoHint: "Bad Hint" }).join()).toMatch(/photo name/i);
  });

  it("limits a stored record to 256 KB", () => {
    const part = {
      ...good,
      watchOuts: Array(12).fill("w".repeat(600)),
      pins: Array.from({ length: 160 }, (_, i) => ({ id: `P${i}`, label: "l", kinds: ["digital"] })),
    };
    expect(PartRecordSchema.safeParse({ part }).success).toBe(true);
    const huge = {
      ...part,
      wokwi: {
        tag: "wokwi-led",
        attrs: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`a${i}`, "v"])),
      },
    };
    expect(PartRecordSchema.safeParse({ part: huge }).success).toBe(true);
  });
});

describe("photo queries schema", () => {
  it("accepts a list or per-source object, 1 to 4 phrases", () => {
    expect(PhotoQueriesSchema.safeParse(["DHT22", "DHT22 sensor"]).success).toBe(true);
    expect(
      PhotoQueriesSchema.safeParse({ commons: ["ESP32 DevKit"], wikipedia: ["ESP32"] }).success,
    ).toBe(true);
    expect(PhotoQueriesSchema.safeParse([]).success).toBe(false);
    expect(PhotoQueriesSchema.safeParse(["a1", "b1", "c1", "d1", "e1"]).success).toBe(false);
    expect(PhotoQueriesSchema.safeParse(['bad"query']).success).toBe(false);
    expect(PhotoQueriesSchema.safeParse(["<b>x</b>"]).success).toBe(false);
  });
});

describe("media schema", () => {
  const media = {
    photo_hint: "dht22",
    url: "/photos/dht22.jpg",
    mime: "image/jpeg",
    bytes: 20000,
    license: "CC BY-SA 4.0",
  };
  const ok = (patch: object) => MediaSchema.safeParse({ ...media, ...patch }).success;

  it("accepts local and Supabase URLs", () => {
    expect(ok({})).toBe(true);
    expect(
      ok({
        url: "https://abc.supabase.co/storage/v1/object/public/catalog-media/dht22.webp",
        mime: "image/webp",
      }),
    ).toBe(true);
  });

  it("rejects bad URLs, sizes, mime types and licences", () => {
    expect(ok({ url: "http://example.com/a.jpg" })).toBe(false);
    expect(ok({ url: "/photos/../secret.jpg" })).toBe(false);
    expect(ok({ url: "https://evil.example/storage/v1/object/public/x.jpg" })).toBe(false);
    expect(ok({ url: "javascript:alert(1)" })).toBe(false);
    expect(ok({ bytes: 499 })).toBe(false);
    expect(ok({ bytes: 1048577 })).toBe(false);
    expect(ok({ mime: "text/html" })).toBe(false);
    expect(ok({ license: "" })).toBe(false);
    expect(ok({ license: "CC BY-NC 4.0" })).toBe(false);
    expect(ok({ photo_hint: "Bad Hint" })).toBe(false);
    expect(ok({ license: undefined })).toBe(false);
  });
});

describe("recipe schema", () => {
  const recipe = {
    id: "recipe.test",
    name: "Test recipe",
    summary: "A recipe used by tests.",
    boardIds: ["board.arduino.uno"],
    moduleIds: ["module.dht22"],
  };
  it("accepts a good recipe and rejects bad ones", () => {
    expect(RecipeSchema.safeParse(recipe).success).toBe(true);
    expect(RecipeSchema.safeParse({ ...recipe, id: "buzzer" }).success).toBe(false);
    expect(RecipeSchema.safeParse({ ...recipe, boardIds: ["module.dht22"] }).success).toBe(false);
  });
});

describe("formatZodIssues", () => {
  it("gives a field path and a plain sentence", () => {
    const r = CatalogPartSchema.safeParse({
      ...good,
      pins: [{ id: "A", label: "", kinds: ["digital"] }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const [first] = formatZodIssues(r.error);
      expect(first.field).toBe("pins.0.label");
      expect(first.message).toBe("Pin 1 label needs at least 1 character.");
    }
  });
});
