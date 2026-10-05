import { boards } from "./boards";
import { modules } from "./modules";
import { passives } from "./passives";
import { recipes } from "./recipes";
import type { CatalogSnapshot } from "./registry";
import { SEED_PHOTO_FILES } from "./seed-media";
import { SEED_PHOTO_QUERY_OVERRIDES } from "./seed-photo-queries";
import type { CatalogPart } from "./types";

export { SEED_PHOTO_FILES, SEED_PHOTO_QUERY_OVERRIDES };

/** Assemble the bundled catalog (the default registry content). */
export function buildSeedSnapshot(): CatalogSnapshot {
  const parts = new Map<string, CatalogPart>(
    [...boards, ...modules, ...passives].map((part) => [part.id, part]),
  );
  return Object.freeze({
    parts,
    boards,
    modules,
    passives,
    recipes,
    recipesById: new Map(recipes.map((recipe) => [recipe.id, recipe])),
    media: new Map(Object.entries(SEED_PHOTO_FILES)),
    photoQueries: new Map(Object.entries(SEED_PHOTO_QUERY_OVERRIDES)),
    revisions: new Map<string, string>(),
  });
}

export const SEED_SNAPSHOT: CatalogSnapshot = buildSeedSnapshot();
