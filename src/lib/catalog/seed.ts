import { boards as baseBoards } from "./boards";
import { modules as baseModules } from "./modules";
import { passives as basePassives } from "./passives";
import { EXTRA_BASICS } from "./extra/basics";
import { EXTRA_OUTPUTS } from "./extra/outputs";
import { EXTRA_DISPLAYS } from "./extra/displays";
import { EXTRA_SENSORS } from "./extra/sensors";
import { EXTRA_BOARDS } from "./extra/boards";
import { recipes } from "./recipes";
import type { CatalogSnapshot } from "./registry";
import { SEED_PHOTO_FILES } from "./seed-media";
import { SEED_PHOTO_QUERY_OVERRIDES } from "./seed-photo-queries";
import type { CatalogPart } from "./types";

export { SEED_PHOTO_FILES, SEED_PHOTO_QUERY_OVERRIDES };

/** Assemble the bundled catalog (the default registry content). */
export function buildSeedSnapshot(): CatalogSnapshot {
  const boards = [...baseBoards, ...EXTRA_BOARDS];
  const modules = [...baseModules, ...EXTRA_OUTPUTS, ...EXTRA_DISPLAYS, ...EXTRA_SENSORS];
  const passives = [...basePassives, ...EXTRA_BASICS];
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
