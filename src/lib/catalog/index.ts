import { getActiveCatalog } from "./registry";
import type { CatalogPart, Recipe } from "./types";

/** Active (non-deprecated) parts and recipes of the live catalog. */
export function listCatalog(): {
  boards: CatalogPart[];
  modules: CatalogPart[];
  passives: CatalogPart[];
  recipes: Recipe[];
} {
  const { boards, modules, passives, recipes } = getActiveCatalog();
  return { boards, modules, passives, recipes };
}

/** Every part including deprecated ones (for admin and id resolution). */
export function listCatalogIncludingDeprecated(): CatalogPart[] {
  return [...getActiveCatalog().parts.values()];
}

/** Resolves any part by id, deprecated ones included. */
export function getCatalogPart(id: string): CatalogPart | undefined {
  return getActiveCatalog().parts.get(id);
}

export function isDeprecatedPart(id: string): boolean {
  return getCatalogPart(id)?.deprecated === true;
}

/** The part to prefer instead of a deprecated one, if any. */
export function replacementFor(id: string): CatalogPart | undefined {
  const target = getCatalogPart(id)?.replacedBy;
  return target ? getCatalogPart(target) : undefined;
}

export function getRecipe(id: string): Recipe | undefined {
  return getActiveCatalog().recipesById.get(id);
}

export * from "./types";
