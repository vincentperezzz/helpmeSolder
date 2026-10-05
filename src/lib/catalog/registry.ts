import { SEED_SNAPSHOT } from "./seed";
import type { CatalogPart, PartRecord, PhotoQueriesOverride, Recipe } from "./types";

/**
 * The active catalog: one module variable holding a frozen snapshot. Consumers
 * read it synchronously, so a swap never lands in the middle of a call. The
 * default is the bundled seed (zero rows means today's behaviour).
 */
export type CatalogSnapshot = {
  /** Every part by id, deprecated ones included. */
  readonly parts: ReadonlyMap<string, CatalogPart>;
  /** Active (non-deprecated) parts in list order. */
  readonly boards: CatalogPart[];
  readonly modules: CatalogPart[];
  readonly passives: CatalogPart[];
  /** Active recipes in list order. */
  readonly recipes: Recipe[];
  /** Every recipe by id, deprecated ones included. */
  readonly recipesById: ReadonlyMap<string, Recipe>;
  /** photoHint -> image url. */
  readonly media: ReadonlyMap<string, string>;
  readonly photoQueries: ReadonlyMap<string, PhotoQueriesOverride>;
  /** id -> 'r<version>' for ids backed by a DB row (absent means seed). */
  readonly revisions: ReadonlyMap<string, string>;
};

export type PartKind = CatalogPart["kind"];

export type RawPartRow = {
  id: string;
  kind: PartKind;
  /** PartRecord (or null when nothing is published yet). Validated on read. */
  published: unknown;
  /** Seed record the admin edited from (three-way merge base): PartRecord or bare part. */
  seed_base: unknown;
  origin: "seed" | "admin";
  lifecycle: "active" | "deprecated";
  replaced_by: string | null;
  version: number;
};

export type RawRecipeRow = {
  id: string;
  /** Recipe or null. */
  published: unknown;
  seed_base: unknown;
  origin: "seed" | "admin";
  lifecycle: "active" | "deprecated";
  replaced_by: string | null;
  version: number;
};

export type RawMediaRow = { photo_hint: string; url: string };

/** What the DB loader fetches; `buildSnapshot` is pure over it. */
export type RawRows = {
  parts: RawPartRow[];
  recipes: RawRecipeRow[];
  media: RawMediaRow[];
  settings: { mode: "db" | "seed" };
};

export type CatalogProblem = { kind: "part" | "recipe" | "media"; id: string; message: string };

/** A seeded record the admin changed in a field the code also changed. */
export type CatalogDrift = { kind: "part" | "recipe"; id: string; fields: string[] };

export type BuildOptions = {
  /** Return true to accept; false or a message to reject (row skipped, seed/base kept). */
  validate?: (record: PartRecord | { recipe: Recipe }, kind: "part" | "recipe") => boolean | string;
};

export type BuildResult = {
  snapshot: CatalogSnapshot;
  problems: CatalogProblem[];
  drift: CatalogDrift[];
};

let active: CatalogSnapshot = SEED_SNAPSHOT;

export function getActiveCatalog(): CatalogSnapshot {
  return active;
}

/** Atomic replace: callers holding the old snapshot keep a consistent view. */
export function swapCatalog(next: CatalogSnapshot): void {
  active = Object.isFrozen(next) ? next : Object.freeze({ ...next });
}

export function resetCatalogToSeed(): void {
  active = SEED_SNAPSHOT;
}

/** 's' for a pure seed part, 'r<version>' when a DB row backs it. */
export function getPartRevision(id: string): string {
  return active.revisions.get(id) ?? "s";
}

// -- three-way merge --------------------------------------------------------

export function stableEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => stableEqual(item, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const key of keys) {
    if (!stableEqual(ao[key], bo[key])) return false;
  }
  return true;
}

/**
 * Three-way merge at top-level field granularity.
 * base = what the admin started from, ours = admin's published doc,
 * theirs = current seed. Both changed differently: ours wins and the field is a conflict.
 */
export function mergeSeeded<T extends object>(
  base: T,
  ours: T,
  theirs: T,
): { doc: T; conflicts: string[] } {
  const b = base as Record<string, unknown>;
  const o = ours as Record<string, unknown>;
  const t = theirs as Record<string, unknown>;
  const doc: Record<string, unknown> = {};
  const conflicts: string[] = [];
  const keys = new Set([...Object.keys(b), ...Object.keys(o), ...Object.keys(t)]);
  for (const key of keys) {
    let value: unknown;
    if (stableEqual(o[key], b[key])) value = t[key];
    else if (stableEqual(t[key], b[key])) value = o[key];
    else {
      value = o[key];
      if (!stableEqual(o[key], t[key])) conflicts.push(key);
    }
    if (value !== undefined) doc[key] = value;
  }
  return { doc: doc as T, conflicts };
}

// -- snapshot builder -------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function basePart(value: unknown): CatalogPart | null {
  if (!isObject(value)) return null;
  if (isObject(value.part)) return value.part as unknown as CatalogPart;
  return typeof value.id === "string" ? (value as unknown as CatalogPart) : null;
}

function asPartRecord(value: unknown): PartRecord | null {
  if (!isObject(value) || !isObject(value.part)) return null;
  const record: PartRecord = { part: value.part as unknown as CatalogPart };
  if (value.photoQueries !== undefined && value.photoQueries !== null) {
    record.photoQueries = value.photoQueries as PhotoQueriesOverride;
  }
  return record;
}

function rejection(result: boolean | string): string | null {
  if (result === true) return null;
  return result === false ? "rejected by validation" : result;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildSnapshot(
  seed: CatalogSnapshot,
  rows: RawRows,
  opts: BuildOptions = {},
): BuildResult {
  const problems: CatalogProblem[] = [];
  const drift: CatalogDrift[] = [];
  if (rows.settings?.mode === "seed") return { snapshot: seed, problems, drift };

  const validate = opts.validate ?? (() => true);
  const parts = new Map(seed.parts);
  const photoQueries = new Map(seed.photoQueries);
  const media = new Map(seed.media);
  const revisions = new Map(seed.revisions);
  // Seed order first; admin-added parts are appended in row order.
  const order: Record<PartKind, string[]> = {
    board: seed.boards.map((p) => p.id),
    module: seed.modules.map((p) => p.id),
    passive: seed.passives.map((p) => p.id),
  };

  for (const row of rows.parts ?? []) {
    try {
      const seedPart = seed.parts.get(row.id);
      const record = asPartRecord(row.published);
      if (row.published != null && !record) throw new Error("published is not a part record");
      let part: CatalogPart;
      let queries: PhotoQueriesOverride | undefined;

      if (row.origin === "admin") {
        if (!record) throw new Error("admin part has no published record");
        part = record.part;
        queries = record.photoQueries;
      } else if (!seedPart) {
        throw new Error("seed-origin row has no matching seed part");
      } else if (record) {
        const base = basePart(row.seed_base) ?? seedPart;
        const merged = mergeSeeded(base, record.part, seedPart);
        part = merged.doc;
        queries = record.photoQueries;
        if (merged.conflicts.length) drift.push({ kind: "part", id: row.id, fields: merged.conflicts });
      } else {
        part = seedPart;
      }

      if (part.id !== row.id) throw new Error(`part id "${part.id}" does not match row id`);
      if (part.kind !== row.kind) throw new Error(`part kind "${part.kind}" does not match row kind`);
      if (record) {
        const bad = rejection(validate({ part, photoQueries: queries }, "part"));
        if (bad) throw new Error(bad);
      }

      if (row.lifecycle === "deprecated") {
        const replacedBy = row.replaced_by ?? part.replacedBy;
        part = { ...part, deprecated: true };
        if (replacedBy !== undefined) part.replacedBy = replacedBy;
      }
      const isNew = !parts.has(row.id);
      parts.set(row.id, part);
      if (queries !== undefined) photoQueries.set(row.id, queries);
      revisions.set(row.id, `r${row.version}`);
      if (isNew) order[row.kind].push(row.id);
    } catch (error) {
      problems.push({ kind: "part", id: String(row?.id), message: message(error) });
    }
  }

  const recipesById = new Map(seed.recipesById);
  const recipeOrder = seed.recipes.map((r) => r.id);
  for (const row of rows.recipes ?? []) {
    try {
      const seedRecipe = seed.recipesById.get(row.id);
      if (row.published != null && !isObject(row.published)) throw new Error("published is not a recipe");
      const ours = (row.published ?? null) as Recipe | null;
      let recipe: Recipe;
      if (row.origin === "admin") {
        if (!ours) throw new Error("admin recipe has no published record");
        recipe = ours;
      } else if (!seedRecipe) {
        throw new Error("seed-origin row has no matching seed recipe");
      } else if (ours) {
        const base = isObject(row.seed_base) ? (row.seed_base as unknown as Recipe) : seedRecipe;
        const merged = mergeSeeded(base, ours, seedRecipe);
        recipe = merged.doc;
        if (merged.conflicts.length) drift.push({ kind: "recipe", id: row.id, fields: merged.conflicts });
      } else {
        recipe = seedRecipe;
      }
      if (recipe.id !== row.id) throw new Error(`recipe id "${recipe.id}" does not match row id`);
      if (ours) {
        const bad = rejection(validate({ recipe }, "recipe"));
        if (bad) throw new Error(bad);
      }
      if (!recipesById.has(row.id)) recipeOrder.push(row.id);
      recipesById.set(row.id, recipe);
      revisions.set(row.id, `r${row.version}`);
      if (row.lifecycle === "deprecated") {
        const at = recipeOrder.indexOf(row.id);
        if (at >= 0) recipeOrder.splice(at, 1);
      }
    } catch (error) {
      problems.push({ kind: "recipe", id: String(row?.id), message: message(error) });
    }
  }

  for (const row of rows.media ?? []) {
    if (typeof row?.photo_hint === "string" && typeof row.url === "string" && row.photo_hint && row.url) {
      media.set(row.photo_hint, row.url);
    } else {
      problems.push({ kind: "media", id: String(row?.photo_hint), message: "invalid media row" });
    }
  }

  const activeList = (kind: PartKind): CatalogPart[] =>
    order[kind].map((id) => parts.get(id)).filter((p): p is CatalogPart => !!p && !p.deprecated);

  const snapshot: CatalogSnapshot = Object.freeze({
    parts,
    boards: activeList("board"),
    modules: activeList("module"),
    passives: activeList("passive"),
    recipes: recipeOrder.map((id) => recipesById.get(id)).filter((r): r is Recipe => !!r),
    recipesById,
    media,
    photoQueries,
    revisions,
  });
  return { snapshot, problems, drift };
}
