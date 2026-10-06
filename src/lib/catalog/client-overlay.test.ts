import { describe, expect, it, vi } from "vitest";
import { applyClientOverlay, buildClientOverlay, OVERLAY_MAX_BYTES } from "./client-overlay";
import { getCatalogPart, listCatalog } from "./index";
import { resolvePartPhoto } from "./part-media";
import { buildSnapshot, getActiveCatalog, getPartRevision, resetCatalogToSeed, swapCatalog, type RawPartRow, type RawRows } from "./registry";
import { SEED_SNAPSHOT } from "./seed";
import type { CatalogPart } from "./types";

const uno = SEED_SNAPSHOT.parts.get("board.arduino.uno")!;
const led = SEED_SNAPSHOT.passives.find((p) => !p.id.startsWith("passive.power."))!;

const row = (part: CatalogPart, over: Partial<RawPartRow> = {}): RawPartRow => ({
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
const rows = (over: Partial<RawRows>): RawRows => ({ parts: [], recipes: [], media: [], settings: { mode: "db" }, ...over });
const build = (r: Partial<RawRows>) => buildSnapshot(SEED_SNAPSHOT, rows(r)).snapshot;

const added: CatalogPart = { ...led, id: "passive.admin-widget", name: "Admin widget", photoHint: "admin-widget" };
const renamed: CatalogPart = { ...uno, name: "Uno (edited)" };

describe("client overlay", () => {
  it("is empty and tiny for a pure seed catalog", () => {
    const overlay = buildClientOverlay(SEED_SNAPSHOT, [uno.id, led.id]);
    expect(overlay.parts).toEqual([]);
    expect(overlay.media).toEqual({});
    expect(JSON.stringify(overlay).length).toBeLessThan(120);
  });

  it("carries overridden, admin-added and replacement parts plus media", () => {
    const old: CatalogPart = { ...led };
    const snap = build({
      parts: [
        row(renamed, { version: 3 }),
        row(added, { origin: "admin", version: 1 }),
        row(old, { lifecycle: "deprecated", replaced_by: added.id, version: 2 }),
      ],
      media: [{ photo_hint: uno.photoHint!, url: "https://cdn/x.png" }],
    });
    const overlay = buildClientOverlay(snap, [uno.id, old.id]);
    expect(overlay.parts.map((p) => p.id).sort()).toEqual([added.id, old.id, uno.id].sort());
    expect(overlay.revisions[uno.id]).toBe("r3");
    expect(overlay.parts.find((p) => p.id === old.id)?.deprecated).toBe(true);
    expect(overlay.media[uno.photoHint!]).toBe("https://cdn/x.png");
    expect(JSON.parse(JSON.stringify(overlay))).toEqual(overlay);
  });

  it("omits parts outside the requested ids", () => {
    const snap = build({ parts: [row(renamed, { version: 2 })] });
    expect(buildClientOverlay(snap, [led.id]).parts).toEqual([]);
  });

  it("enforces the 64 KB cap by keeping only the guide's own parts", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const big = "x".repeat(2000);
    const power = SEED_SNAPSHOT.passives.filter((p) => p.id.startsWith("passive.power."));
    const rowsBig = power.map((p) => row({ ...p, description: big }, { version: 2 }));
    const extra = Array.from({ length: 40 }, (_, i) =>
      row({ ...added, id: `passive.big-${i}`, description: big }, { origin: "admin" }),
    );
    const snap = build({ parts: [...rowsBig, ...extra] });
    const overlay = buildClientOverlay(snap, [uno.id]);
    expect(new TextEncoder().encode(JSON.stringify(overlay)).length).toBeLessThanOrEqual(OVERLAY_MAX_BYTES);
    expect(overlay.parts).toEqual([]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("applies idempotently and shows overridden data", () => {
    const snap = build({
      parts: [row(renamed, { version: 3 }), row(added, { origin: "admin" })],
      media: [{ photo_hint: uno.photoHint!, url: "https://cdn/x.png" }],
    });
    const overlay = buildClientOverlay(snap, [uno.id, added.id]);
    applyClientOverlay(overlay);
    expect(getCatalogPart(uno.id)?.name).toBe("Uno (edited)");
    expect(getCatalogPart(added.id)?.name).toBe("Admin widget");
    expect(listCatalog().passives.some((p) => p.id === added.id)).toBe(true);
    expect(listCatalog().boards.filter((p) => p.id === uno.id)).toHaveLength(1);
    expect(resolvePartPhoto(uno.photoHint)).toBe("https://cdn/x.png");
    expect(getPartRevision(uno.id)).toBe("r3");
    const after = getActiveCatalog();
    applyClientOverlay(overlay);
    expect(getActiveCatalog()).toBe(after);
  });

  it("never downgrades a newer part", () => {
    swapCatalog(build({ parts: [row({ ...uno, name: "Newer" }, { version: 5 })] }));
    const older = buildClientOverlay(build({ parts: [row(renamed, { version: 3 })] }), [uno.id]);
    applyClientOverlay(older);
    expect(getCatalogPart(uno.id)?.name).toBe("Newer");
    expect(getPartRevision(uno.id)).toBe("r5");
  });

  it("applies a deprecation by hiding the part from lists", () => {
    const overlay = buildClientOverlay(build({ parts: [row(led, { lifecycle: "deprecated", version: 2 })] }), [led.id]);
    applyClientOverlay(overlay);
    expect(getCatalogPart(led.id)?.deprecated).toBe(true);
    expect(listCatalog().passives.some((p) => p.id === led.id)).toBe(false);
  });

  it("resets to the seed", () => {
    applyClientOverlay(buildClientOverlay(build({ parts: [row(renamed, { version: 3 })] }), [uno.id]));
    resetCatalogToSeed();
    expect(getCatalogPart(uno.id)?.name).toBe(uno.name);
  });
});
