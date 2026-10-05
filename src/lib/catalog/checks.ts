/**
 * Publish checks for one catalog part. Pure: everything it needs to know about the
 * rest of the world (other parts, images, saved guides, recipes) comes in through
 * the injected `PublishContext`, so the same function runs in the admin editor,
 * the import dry run and the tests.
 *
 * Errors block publishing. Warnings are shown but never block.
 *
 *  E1  the record doesn't pass the schema        W1  no drawing for the wiring diagram
 *  E2  no thumbnail image                        W2  Wokwi drawing pins differ from the part's pins
 *  E3  not 1 to 4 photo search phrases           W3  the electrical data changed and guides use it
 *  E4  two pins share an id                      W4  another part has the same name or photo
 *  E5  electrical data names a missing pin       W5  no category set, so one is guessed
 *  E6  a pin used by saved guides was removed
 *  E7  the type (kind) changed while guides use it
 *  E8  retiring a part a recipe uses
 *  E9  bad replacement part
 *  E10 id already taken, or id changed
 *  (plus: a locked field was edited)
 */
import { getDiagramAsset } from "./board-assets";
import { getCatalogPart, listCatalog } from "./index";
import { partCategory, resolvePartPhoto } from "./part-media";
import { defaultQuery, photoQueriesFor } from "./photo-queries";
import {
  formatZodIssues,
  partRecordSchema,
  type Issue,
} from "./schema";
import type { CatalogPart, PartRecord, PhotoQueriesOverride } from "./types";
import { WOKWI_TAGS } from "./wokwi-tags.generated";

export type { Issue } from "./schema";

export type PartUsage = {
  /** Saved guides that use this part. */
  guides: number;
  /** Pin ids of this part that those guides connect wires to. */
  pinsUsed: string[];
};

export type PublishContext = {
  /** Registry lookup. Includes retired (deprecated) parts. */
  getPart(id: string): CatalogPart | undefined;
  /** Parts that show up in lists today (for duplicate name and photo checks). */
  allParts(): CatalogPart[];
  /** Is there a real thumbnail image for this photo name? */
  hasThumbnail(photoHint: string): boolean;
  /** Photo search phrases the part already has (seed or published), if any. */
  curatedPhotoQueries(partId: string): PhotoQueriesOverride | undefined;
  /** Does the wiring diagram have a drawing for this part id? */
  hasDiagram(partId: string): boolean;
  /** How saved guides use the part. */
  usage(partId: string): PartUsage;
  /** Ids of recipes that list the part. */
  recipesUsing(partId: string): string[];
  /** Wokwi element names that exist. */
  tags: ReadonlySet<string>;
  /** The record being replaced; undefined for a brand-new part. */
  previous?: PartRecord;
  /** Every part id that exists, retired ones included. */
  existingIds: ReadonlySet<string>;
  /** Pin names a Wokwi element draws, when known (enables W2). */
  wokwiPinNames?(tag: string): string[] | undefined;
};

export type CheckResult = { errors: Issue[]; warnings: Issue[] };

/** What may not be edited once a part exists. */
export type LockedField = "pins" | "electrical" | "pinIds";

/**
 * Fields the admin may not change for a part, because code or saved data depends on
 * them: battery and supply pins and electrical data (battery-records.ts owns them),
 * the breadboard pins, and the pin ids of any part that has a drawn board image.
 */
export function LOCKED_FIELDS(id: string): LockedField[] {
  if (id.startsWith("passive.power.")) return ["pins", "electrical"];
  if (id === "passive.breadboard.half") return ["pins"];
  if (getDiagramAsset(id)) return ["pinIds"];
  return [];
}

/* ------------------------------ helpers ------------------------------ */

/** JSON with sorted keys, so equal data compares equal whatever the key order. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

function sameData(a: unknown, b: unknown): boolean {
  return stable(a ?? null) === stable(b ?? null);
}

function commonsPhrases(q: PhotoQueriesOverride | undefined): string[] {
  if (!q) return [];
  return Array.isArray(q) ? q : q.commons;
}

function list(items: string[], max = 5): string {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} and ${items.length - max} more` : shown;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/* ------------------------------ the checks ------------------------------ */

export function checkForPublish(record: unknown, ctx: PublishContext): CheckResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const error = (code: string, message: string, field?: string) =>
    errors.push({ code, ...(field ? { field } : {}), message });
  const warn = (code: string, message: string, field?: string) =>
    warnings.push({ code, ...(field ? { field } : {}), message });

  // The part id decides whether the 160-pin cap applies (locked pins).
  const rawId = (record as { part?: { id?: unknown } } | null)?.part?.id;
  const lockedPins = typeof rawId === "string" && LOCKED_FIELDS(rawId).includes("pins");

  // E1 (and E4, E5, which the schema reports with their own codes).
  const parsed = partRecordSchema({ lockedPins }).safeParse(record);
  if (!parsed.success) {
    errors.push(...formatZodIssues(parsed.error));
    return { errors, warnings };
  }
  const { part, photoQueries } = parsed.data as PartRecord;
  const previous = ctx.previous;

  // The Wokwi name must exist in the installed package (the schema checks the bundled list).
  if (part.wokwi && !ctx.tags.has(part.wokwi.tag)) {
    error(
      "unknown_wokwi_tag",
      `The Wokwi element "${part.wokwi.tag}" doesn't exist in the installed drawing library.`,
      "part.wokwi.tag",
    );
  }

  // E10: id collision or id change.
  if (!previous && ctx.existingIds.has(part.id)) {
    error(
      "id_collision",
      `A part with the id "${part.id}" already exists. Pick a different id, or edit that part instead.`,
      "part.id",
    );
  }
  if (previous && previous.part.id !== part.id) {
    error(
      "id_changed",
      `A part's id can never change (saved guides remember it). Keep "${previous.part.id}", or make a new part and retire this one.`,
      "part.id",
    );
  }

  // E2: thumbnail.
  if (!part.photoHint) {
    error("missing_thumbnail", "This part needs a photo name so it can show a picture.", "part.photoHint");
  } else if (!ctx.hasThumbnail(part.photoHint)) {
    error(
      "missing_thumbnail",
      `There is no image for the photo name "${part.photoHint}". Upload one on the Media page first.`,
      "part.photoHint",
    );
  }

  // E3: 1 to 4 photo search phrases, from this edit or already on the part.
  const phrases = commonsPhrases(photoQueries ?? ctx.curatedPhotoQueries(part.id));
  if (phrases.length < 1 || phrases.length > 4) {
    error(
      "photo_phrases",
      phrases.length === 0
        ? "Add 1 to 4 photo search phrases (words a good photo's file name would contain), so the Parts tab can find a real photo."
        : `Use at most 4 photo search phrases (this has ${phrases.length}).`,
      "photoQueries",
    );
  }

  // E6 / E7: saved guides depend on the old shape.
  if (previous) {
    const usage = ctx.usage(part.id);
    if (usage.guides > 0) {
      const kept = new Set(part.pins.map((p) => p.id));
      const lost = usage.pinsUsed.filter((id) => !kept.has(id));
      if (lost.length > 0) {
        error(
          "pin_removed_in_use",
          `${usage.guides === 1 ? "A saved guide uses" : `${usage.guides} saved guides use`} the pin${lost.length === 1 ? "" : "s"} ${list(lost)} on this part. Removing or renaming ${lost.length === 1 ? "it" : "them"} would break the wiring. Keep the pin id and change only its label.`,
          "part.pins",
        );
      }
      if (previous.part.kind !== part.kind) {
        error(
          "kind_changed_in_use",
          `This part is a ${previous.part.kind} and ${usage.guides} saved guide${usage.guides === 1 ? " uses" : "s use"} it as one. Its type can't change.`,
          "part.kind",
        );
      }
    }

    // Locked fields.
    const locked = LOCKED_FIELDS(part.id);
    if (locked.includes("pins") && !sameData(previous.part.pins, part.pins)) {
      error("locked_field", "The pins of this part are managed in code and can't be edited here.", "part.pins");
    } else if (locked.includes("pinIds")) {
      const before = previous.part.pins.map((p) => p.id).sort();
      const after = part.pins.map((p) => p.id).sort();
      if (!sameData(before, after)) {
        error(
          "locked_field",
          "This part has a drawn picture in the wiring diagram, so its pin ids can't change. You can still edit pin labels.",
          "part.pins",
        );
      }
    }
    if (locked.includes("electrical") && !sameData(previous.part.electrical, part.electrical)) {
      error(
        "locked_field",
        "The voltage data of this part is managed in code and can't be edited here.",
        "part.electrical",
      );
    }
  }

  // E8: retiring a part a recipe uses.
  if (part.deprecated) {
    const recipes = ctx.recipesUsing(part.id);
    if (recipes.length > 0) {
      error(
        "deprecated_in_recipe",
        `Recipe${recipes.length === 1 ? "" : "s"} ${list(recipes)} still ${recipes.length === 1 ? "uses" : "use"} this part. Change ${recipes.length === 1 ? "it" : "them"} first, then retire the part.`,
        "part.deprecated",
      );
    }
  }

  // E9: replacement.
  if (part.replacedBy !== undefined) {
    const target = ctx.getPart(part.replacedBy);
    if (!part.deprecated) {
      error("bad_replacement", "Only a retired part can name a replacement. Retire it, or clear the replacement.", "part.replacedBy");
    }
    if (part.replacedBy === part.id) {
      error("bad_replacement", "A part can't be replaced by itself.", "part.replacedBy");
    } else if (!target) {
      error("bad_replacement", `The replacement "${part.replacedBy}" doesn't exist.`, "part.replacedBy");
    } else if (target.deprecated) {
      error("bad_replacement", `The replacement "${part.replacedBy}" is retired too. Pick a part that is still in use.`, "part.replacedBy");
    }
  }

  // W1: drawing.
  if (!part.wokwi?.tag && !ctx.hasDiagram(part.id)) {
    warn(
      "no_drawing",
      "This part has no drawing, so the wiring diagram will show a plain box for it.",
      "part.wokwi",
    );
  }

  // W2: Wokwi pins.
  if (part.wokwi && ctx.wokwiPinNames) {
    const names = ctx.wokwiPinNames(part.wokwi.tag);
    if (names && names.length > 0) {
      const known = new Set(names.map((n) => n.toLowerCase()));
      const missing = part.pins.map((p) => p.id).filter((id) => !known.has(id.toLowerCase()));
      if (missing.length > 0) {
        warn(
          "wokwi_pin_mismatch",
          `The drawing doesn't have pins named ${list(missing)}, so wires to ${missing.length === 1 ? "it" : "them"} may land in the wrong place.`,
          "part.pins",
        );
      }
    }
  }

  // W3: electrical change with guides using the part.
  if (previous && !sameData(previous.part.electrical, part.electrical)) {
    const usage = ctx.usage(part.id);
    if (usage.guides > 0) {
      warn(
        "electrical_impact",
        `${usage.guides === 1 ? "A saved guide uses" : `${usage.guides} saved guides use`} this part. Changing its voltage data can change what the wiring check says about ${usage.guides === 1 ? "it" : "them"}. Check the recent guides after publishing.`,
        "part.electrical",
      );
    }
  }

  // W4: duplicate name or photo.
  const others = ctx.allParts().filter((p) => p.id !== part.id);
  const sameName = others.filter((p) => norm(p.name) === norm(part.name));
  if (sameName.length > 0) {
    warn("duplicate_name", `Another part is already called "${sameName[0].name}" (${sameName[0].id}). Two parts with one name are hard to tell apart.`, "part.name");
  }
  const sameHint = part.photoHint ? others.filter((p) => p.photoHint === part.photoHint) : [];
  if (sameHint.length > 0) {
    warn("duplicate_photo", `${list(sameHint.map((p) => p.id), 3)} already ${sameHint.length === 1 ? "uses" : "use"} the same photo name "${part.photoHint}".`, "part.photoHint");
  }

  // W5: category.
  if (!part.category && part.kind !== "board") {
    warn(
      "guessed_category",
      `No category is set, so it will be guessed as "${partCategory(part)}" from the name. Pick one to be sure.`,
      "part.category",
    );
  }

  return { errors, warnings };
}

/* ------------------------------ default context ------------------------------ */

/**
 * A context built from the bundled registry and photo tables, with no file access:
 * a thumbnail counts when its photo name is registered. Pass overrides for anything
 * else (usage from the database, a disk check for images, `previous`).
 */
export function registryContext(overrides: Partial<PublishContext> = {}): PublishContext {
  const all = (): CatalogPart[] => {
    const c = listCatalog();
    return [...c.boards, ...c.modules, ...c.passives];
  };
  return {
    getPart: getCatalogPart,
    allParts: all,
    hasThumbnail: (hint) => resolvePartPhoto(hint) !== null,
    curatedPhotoQueries: (id) => {
      const part = all().find((p) => p.id === id);
      if (!part) return undefined;
      const category = partCategory(part);
      const q = photoQueriesFor(part, category);
      const fallback = defaultQuery(part.name, category);
      return q.commons.length === 1 && q.commons[0] === fallback ? undefined : q.commons;
    },
    hasDiagram: (id) => Boolean(getDiagramAsset(id)),
    usage: () => ({ guides: 0, pinsUsed: [] }),
    recipesUsing: (id) =>
      listCatalog()
        .recipes.filter((r) => r.boardIds.includes(id) || r.moduleIds.includes(id))
        .map((r) => r.id),
    tags: WOKWI_TAGS,
    existingIds: new Set(all().map((p) => p.id)),
    ...overrides,
  };
}
