import { describe, expect, it } from "vitest";
import { getCatalogPart, getRecipe, isDeprecatedPart, listCatalog, listCatalogIncludingDeprecated, replacementFor } from "./index";
import { partCategory, resolvePartPhoto } from "./part-media";
import { photoQueriesFor } from "./photo-queries";
import {
  buildSnapshot,
  getActiveCatalog,
  getPartRevision,
  mergeSeeded,
  swapCatalog,
  type RawPartRow,
  type RawRows,
} from "./registry";
import { recipes } from "./recipes";
import { SEED_SNAPSHOT } from "./seed";

const { boards, modules, passives } = SEED_SNAPSHOT;
import type { CatalogPart } from "./types";

const rows = (over: Partial<RawRows> = {}): RawRows => ({
  parts: [],
  recipes: [],
  media: [],
  settings: { mode: "db" },
  ...over,
});

const partRow = (part: CatalogPart, over: Partial<RawPartRow> = {}): RawPartRow => ({
  id: part.id,
  kind: part.kind,
  published: { part },
  seed_base: null,
  origin: "seed",
  lifecycle: "active",
  replaced_by: null,
  version: 1,
  ...over,
});

const uno = boards.find((b) => b.id === "board.arduino.uno")!;

describe("catalog registry", () => {
  it("serves the seed lists unchanged with no rows", () => {
    const { snapshot, problems } = buildSnapshot(SEED_SNAPSHOT, rows());
    expect(problems).toEqual([]);
    expect(snapshot.boards).toEqual(boards);
    expect(snapshot.modules).toEqual(modules);
    expect(snapshot.passives).toEqual(passives);
    expect(snapshot.recipes).toEqual(recipes);
    expect(listCatalog()).toEqual({ boards, modules, passives, recipes });
    expect(listCatalog().boards.map((p) => p.id)).toEqual(boards.map((p) => p.id));
    expect(getPartRevision(uno.id)).toBe("s");
  });

  it("overrides a seeded part and keeps untouched fields on the seed", () => {
    const base = { ...uno };
    const ours = { ...uno, name: "Uno (admin)" };
    const { snapshot } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({ parts: [partRow(ours, { seed_base: { part: base }, version: 3 })] }),
    );
    expect(snapshot.parts.get(uno.id)?.name).toBe("Uno (admin)");
    expect(snapshot.boards.map((b) => b.id)).toEqual(boards.map((b) => b.id));
    expect(snapshot.revisions.get(uno.id)).toBe("r3");
    swapCatalog(snapshot);
    expect(getPartRevision(uno.id)).toBe("r3");
    expect(getCatalogPart(uno.id)?.name).toBe("Uno (admin)");
  });

  it("appends an admin-added part", () => {
    const added: CatalogPart = {
      id: "module.test.thing",
      name: "Thing",
      kind: "module",
      description: "d",
      pins: [],
      photoHint: "thing",
      category: "Sensor",
    };
    const { snapshot } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({ parts: [partRow(added, { origin: "admin" })] }),
    );
    expect(snapshot.modules.at(-1)?.id).toBe("module.test.thing");
    expect(snapshot.modules).toHaveLength(modules.length + 1);
    swapCatalog(snapshot);
    expect(getCatalogPart(added.id)).toBeDefined();
    expect(partCategory(getCatalogPart(added.id))).toBe("Sensor");
  });

  it("hides deprecated parts from lists but still resolves them", () => {
    const { snapshot } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({
        parts: [
          partRow(uno, {
            published: null,
            lifecycle: "deprecated",
            replaced_by: "board.arduino.nano",
          }),
        ],
      }),
    );
    swapCatalog(snapshot);
    expect(listCatalog().boards.some((b) => b.id === uno.id)).toBe(false);
    expect(listCatalogIncludingDeprecated().some((p) => p.id === uno.id)).toBe(true);
    expect(getCatalogPart(uno.id)?.deprecated).toBe(true);
    expect(isDeprecatedPart(uno.id)).toBe(true);
    expect(replacementFor(uno.id)?.id).toBe("board.arduino.nano");
    expect(getRecipe(recipes[0].id)).toBeDefined();
  });

  it("skips an invalid row with a problem and keeps the seed", () => {
    const bad = partRow(uno, { published: { nope: true } });
    const rejected = partRow({ ...uno, name: "rejected" });
    const mismatch = partRow({ ...uno, id: "board.other" });
    const { snapshot, problems } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({ parts: [bad, rejected, mismatch] }),
      { validate: (r) => ("part" in r && r.part.name === "rejected" ? "no thanks" : true) },
    );
    expect(problems.map((p) => p.id)).toEqual([uno.id, uno.id, "board.other"]);
    expect(problems[1].message).toBe("no thanks");
    expect(snapshot.parts.get(uno.id)).toEqual(uno);
  });

  it("overrides media and photo queries", () => {
    const { snapshot } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({
        media: [{ photo_hint: "arduino-uno", url: "https://x.test/uno.png" }],
        parts: [partRow(uno, { published: { part: uno, photoQueries: ["custom uno"] } })],
      }),
    );
    expect(resolvePartPhoto("arduino-uno")).toBe("/photos/arduino-uno.jpg");
    swapCatalog(snapshot);
    expect(resolvePartPhoto("arduino-uno")).toBe("https://x.test/uno.png");
    expect(photoQueriesFor(uno, "Board").commons).toEqual(["custom uno"]);
  });

  it("reports drift when both sides changed the same field", () => {
    const base = { ...uno, name: "old" };
    const { snapshot, drift } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({ parts: [partRow({ ...uno, name: "mine" }, { seed_base: { part: base } })] }),
    );
    expect(snapshot.parts.get(uno.id)?.name).toBe("mine");
    expect(drift).toEqual([{ kind: "part", id: uno.id, fields: ["name"] }]);
  });

  it("ignores rows in seed mode", () => {
    const { snapshot } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({ settings: { mode: "seed" }, parts: [partRow({ ...uno, name: "x" })] }),
    );
    expect(snapshot).toBe(SEED_SNAPSHOT);
  });

  it("keeps an old snapshot reference unchanged after a swap", () => {
    const before = getActiveCatalog();
    const { snapshot } = buildSnapshot(
      SEED_SNAPSHOT,
      rows({ parts: [partRow({ ...uno, name: "changed" })] }),
    );
    swapCatalog(snapshot);
    expect(getActiveCatalog()).not.toBe(before);
    expect(before.parts.get(uno.id)?.name).toBe(uno.name);
    expect(Object.isFrozen(getActiveCatalog())).toBe(true);
  });
});

describe("mergeSeeded", () => {
  const base = { a: 1, b: [1, 2], c: { x: 1, y: 2 } };

  it("takes theirs when only theirs changed", () => {
    const r = mergeSeeded(base, { ...base }, { ...base, a: 2 });
    expect(r.doc.a).toBe(2);
    expect(r.conflicts).toEqual([]);
  });

  it("takes ours when only ours changed", () => {
    const r = mergeSeeded(base, { ...base, b: [9] }, { ...base });
    expect(r.doc.b).toEqual([9]);
    expect(r.conflicts).toEqual([]);
  });

  it("is key-order independent when comparing", () => {
    const r = mergeSeeded(base, { ...base, c: { y: 2, x: 1 } }, { ...base, a: 5 });
    expect(r.doc.a).toBe(5);
    expect(r.conflicts).toEqual([]);
  });

  it("keeps ours and flags a conflict when both changed", () => {
    const r = mergeSeeded(base, { ...base, a: 2 }, { ...base, a: 3 });
    expect(r.doc.a).toBe(2);
    expect(r.conflicts).toEqual(["a"]);
  });

  it("does not flag both sides making the same change", () => {
    const r = mergeSeeded(base, { ...base, a: 2 }, { ...base, a: 2 });
    expect(r.conflicts).toEqual([]);
  });
});
