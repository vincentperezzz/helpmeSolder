import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCKED_FIELDS, checkForPublish, registryContext, type PublishContext } from "./checks";
import { listCatalog } from "./index";
import { resolvePartPhoto } from "./part-media";
import type { CatalogPart, PartRecord } from "./types";

const all = () => {
  const c = listCatalog();
  return [...c.boards, ...c.modules, ...c.passives];
};

const sensor: CatalogPart = {
  id: "module.test.sensor",
  name: "Test sensor",
  kind: "module",
  description: "A small test sensor used only by the unit tests, long enough to pass.",
  photoHint: "dht22",
  category: "Sensor",
  pins: [
    { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
    { id: "GND", label: "GND", kinds: ["ground"] },
    { id: "OUT", label: "OUT", kinds: ["digital"] },
  ],
  wokwi: { tag: "wokwi-led" },
};
const record: PartRecord = { part: sensor, photoQueries: ["Test sensor photo"] };

/** A context for a part that does not exist yet. */
const fresh = (over: Partial<PublishContext> = {}) => registryContext(over);
/** A context for editing `rec` in place. */
const editing = (rec: PartRecord, over: Partial<PublishContext> = {}) =>
  registryContext({
    previous: rec,
    existingIds: new Set([...all().map((p) => p.id), rec.part.id]),
    ...over,
  });

const codes = (r: { errors: { code: string }[]; warnings: { code: string }[] }) => ({
  e: r.errors.map((i) => i.code),
  w: r.warnings.map((i) => i.code),
});

describe("checkForPublish", () => {
  it("passes a good new part with no errors", () => {
    const r = checkForPublish(record, fresh());
    expect(r.errors).toEqual([]);
  });

  it("E1 reports schema problems in plain words and stops there", () => {
    const r = checkForPublish({ part: { ...sensor, name: "x" } }, fresh());
    expect(r.errors[0].code).toBe("schema");
    expect(r.errors[0].message).toMatch(/Name needs at least 2 characters/);
    expect(checkForPublish("nonsense", fresh()).errors[0].code).toBe("schema");
  });

  it("E2 needs a thumbnail", () => {
    expect(codes(checkForPublish({ part: { ...sensor, photoHint: undefined }, photoQueries: record.photoQueries }, fresh())).e).toContain("missing_thumbnail");
    const r = checkForPublish(record, fresh({ hasThumbnail: () => false }));
    expect(codes(r).e).toContain("missing_thumbnail");
    expect(r.errors.find((e) => e.code === "missing_thumbnail")?.message).toMatch(/no image/);
  });

  it("E3 needs 1 to 4 photo phrases", () => {
    expect(codes(checkForPublish({ part: sensor }, fresh())).e).toContain("photo_phrases");
    // Phrases already on the part count.
    expect(
      codes(checkForPublish({ part: sensor }, fresh({ curatedPhotoQueries: () => ["Test sensor photo"] }))).e,
    ).not.toContain("photo_phrases");
    // Too many phrases are a schema error.
    const r = checkForPublish({ part: sensor, photoQueries: ["aa", "bb", "cc", "dd", "ee"] }, fresh());
    expect(r.errors[0].code).toBe("schema");
  });

  it("E4 rejects duplicate pin ids", () => {
    const part = { ...sensor, pins: [...sensor.pins, sensor.pins[0]] };
    expect(codes(checkForPublish({ ...record, part }, fresh())).e).toEqual(["duplicate_pin_ids"]);
  });

  it("E5 rejects electrical data that names a missing pin", () => {
    const part = { ...sensor, electrical: { pins: { NOPE: { accepts: { min: 1, max: 2 } } }, inputOnlyPins: ["NOPE2"] } };
    expect(codes(checkForPublish({ ...record, part }, fresh())).e).toEqual([
      "bad_electrical_reference",
      "bad_electrical_reference",
    ]);
  });

  it("E6 blocks removing or renaming a pin that saved guides use", () => {
    const usage = () => ({ guides: 3, pinsUsed: ["OUT"] });
    const renamed = { ...record, part: { ...sensor, pins: sensor.pins.map((p) => (p.id === "OUT" ? { ...p, id: "SIG" } : p)) } };
    const r = checkForPublish(renamed, editing(record, { usage }));
    expect(codes(r).e).toEqual(["pin_removed_in_use"]);
    expect(r.errors[0].message).toMatch(/3 saved guides use the pin OUT/);
    // Removing a pin nobody uses is fine; so is changing a label.
    const unused = { ...record, part: { ...sensor, pins: sensor.pins.filter((p) => p.id !== "VCC") } };
    expect(codes(checkForPublish(unused, editing(record, { usage }))).e).toEqual([]);
    const relabel = { ...record, part: { ...sensor, pins: sensor.pins.map((p) => (p.id === "OUT" ? { ...p, label: "Signal" } : p)) } };
    expect(codes(checkForPublish(relabel, editing(record, { usage }))).e).toEqual([]);
  });

  it("E7 blocks a kind change while guides use the part", () => {
    const changed = { ...record, part: { ...sensor, id: "module.test.sensor", kind: "passive" as const } };
    // The id prefix no longer matches, so use a part whose id fits both: build from a passive.
    expect(checkForPublish(changed, fresh()).errors[0].code).toBe("schema");
    const prev: PartRecord = { part: { ...sensor, kind: "module" }, photoQueries: record.photoQueries };
    const next: PartRecord = { part: { ...sensor, kind: "module" }, photoQueries: record.photoQueries };
    // Simulate a previous record that was a different kind (e.g. imported before the prefix rule).
    const odd = { ...prev, part: { ...prev.part, kind: "passive" as const } };
    const r = checkForPublish(next, editing(odd, { usage: () => ({ guides: 2, pinsUsed: [] }) }));
    expect(codes(r).e).toEqual(["kind_changed_in_use"]);
    expect(checkForPublish(next, editing(odd)).errors).toEqual([]);
  });

  it("E8 blocks retiring a part a recipe uses", () => {
    const part = { ...sensor, deprecated: true as const };
    const r = checkForPublish({ ...record, part }, editing(record, { recipesUsing: () => ["recipe.buzzer"] }));
    expect(codes(r).e).toEqual(["deprecated_in_recipe"]);
    expect(r.errors[0].message).toMatch(/recipe\.buzzer/);
    expect(codes(checkForPublish({ ...record, part }, editing(record))).e).toEqual([]);
  });

  it("E9 checks the replacement part", () => {
    const retired = { ...sensor, deprecated: true as const };
    const e = (replacedBy: string, over: Partial<PublishContext> = {}) =>
      codes(checkForPublish({ ...record, part: { ...retired, replacedBy } }, editing(record, over))).e;
    expect(e("module.dht22")).toEqual([]);
    expect(e("module.does.not.exist")).toEqual(["bad_replacement"]);
    expect(e("module.test.sensor")).toEqual(["schema"]);
    expect(e("module.dht22", { getPart: (id) => ({ ...sensor, id, deprecated: true }) })).toEqual(["bad_replacement"]);
    // A live part can't name a replacement.
    expect(codes(checkForPublish({ ...record, part: { ...sensor, replacedBy: "module.dht22" } }, editing(record))).e).toEqual(["bad_replacement"]);
  });

  it("E10 rejects an id that already exists, and an id change", () => {
    const taken = { ...record, part: { ...sensor, id: "module.dht22" } };
    expect(codes(checkForPublish(taken, fresh())).e).toEqual(["id_collision"]);
    const moved = { ...record, part: { ...sensor, id: "module.test.other" } };
    expect(codes(checkForPublish(moved, editing(record))).e).toEqual(["id_changed"]);
  });

  it("rejects edits to locked fields", () => {
    const battery = all().find((p) => p.id === "passive.power.battery.9v")!;
    const prev: PartRecord = { part: battery, photoQueries: ["9V battery"] };
    expect(LOCKED_FIELDS(battery.id)).toEqual(["pins", "electrical"]);
    const edited = { ...prev, part: { ...battery, name: "9 volt battery" } };
    expect(codes(checkForPublish(edited, editing(prev))).e).toEqual([]);
    const pins = { ...prev, part: { ...battery, pins: battery.pins.map((p, i) => (i === 0 ? { ...p, label: "Changed" } : p)) } };
    expect(codes(checkForPublish(pins, editing(prev))).e).toEqual(["locked_field"]);
    const elec = { ...prev, part: { ...battery, electrical: { ...battery.electrical, logic: "5v" as const } } };
    expect(codes(checkForPublish(elec, editing(prev))).e).toEqual(["locked_field"]);
  });

  it("locks pin ids (not labels) of a part with a board drawing", () => {
    const uno = all().find((p) => p.id === "board.pico.rp2040")!;
    expect(LOCKED_FIELDS(uno.id)).toEqual(["pinIds"]);
    expect(LOCKED_FIELDS("passive.breadboard.half")).toEqual(["pins"]);
    expect(LOCKED_FIELDS("module.dht22")).toEqual([]);
    const prev: PartRecord = { part: uno, photoQueries: ["Raspberry Pi Pico"] };
    const relabel = { ...prev, part: { ...uno, pins: uno.pins.map((p, i) => (i === 0 ? { ...p, label: "Renamed" } : p)) } };
    expect(codes(checkForPublish(relabel, editing(prev))).e).toEqual([]);
    const renamed = { ...prev, part: { ...uno, pins: uno.pins.map((p, i) => (i === uno.pins.length - 1 && !uno.electrical?.pins?.[p.id] ? { ...p, id: "ZZ" } : p)) } };
    expect(codes(checkForPublish(renamed, editing(prev))).e).toContain("locked_field");
  });

  it("W1 warns when there is no drawing", () => {
    const part = { ...sensor, wokwi: undefined };
    expect(codes(checkForPublish({ ...record, part }, fresh())).w).toContain("no_drawing");
    expect(codes(checkForPublish(record, fresh())).w).not.toContain("no_drawing");
  });

  it("W2 warns when the Wokwi drawing lacks pins", () => {
    const r = checkForPublish(record, fresh({ wokwiPinNames: () => ["A", "C"] }));
    expect(codes(r).w).toContain("wokwi_pin_mismatch");
    expect(codes(checkForPublish(record, fresh({ wokwiPinNames: () => ["vcc", "gnd", "out"] }))).w).not.toContain("wokwi_pin_mismatch");
  });

  it("W3 warns when electrical data changes and guides use the part", () => {
    const part = { ...sensor, electrical: { logic: "5v" as const } };
    const r = checkForPublish({ ...record, part }, editing(record, { usage: () => ({ guides: 4, pinsUsed: [] }) }));
    expect(codes(r).w).toContain("electrical_impact");
    expect(codes(checkForPublish({ ...record, part }, editing(record))).w).not.toContain("electrical_impact");
  });

  it("W4 warns about a duplicate name or photo name", () => {
    const dht = all().find((p) => p.id === "module.dht22")!;
    const sameName = { ...record, part: { ...sensor, name: dht.name } };
    expect(codes(checkForPublish(sameName, fresh())).w).toContain("duplicate_name");
    const sameHint = { ...record, part: { ...sensor, photoHint: dht.photoHint } };
    expect(codes(checkForPublish(sameHint, fresh())).w).toContain("duplicate_photo");
  });

  it("W5 warns when the category is only guessed", () => {
    const part = { ...sensor, category: undefined };
    expect(codes(checkForPublish({ ...record, part }, fresh())).w).toContain("guessed_category");
    expect(codes(checkForPublish(record, fresh())).w).not.toContain("guessed_category");
  });
});

describe("seed parts", () => {
  /** A context that also checks the thumbnail file is on disk and not empty. */
  const disk = (rec: PartRecord) =>
    editing(rec, {
      hasThumbnail: (hint) => {
        const url = resolvePartPhoto(hint);
        if (!url) return false;
        const file = path.join(process.cwd(), "public", url);
        return existsSync(file) && statSync(file).size >= 500;
      },
    });

  it("every seed part passes with a disk-backed context", () => {
    const failures: string[] = [];
    const base = registryContext();
    for (const part of all()) {
      const rec: PartRecord = { part };
      const result = checkForPublish(rec, disk(rec));
      for (const e of result.errors) failures.push(`${part.id}: [${e.code}] ${e.message}`);
      // Curated phrases must exist for every seed part.
      if (!base.curatedPhotoQueries(part.id)) failures.push(`${part.id}: no curated photo phrases`);
    }
    expect(failures).toEqual([]);
  });
});
