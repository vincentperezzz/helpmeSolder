import { boards } from "./boards";
import { modules } from "./modules";
import { recipes } from "./recipes";
import type { CatalogPart, Recipe } from "./types";

const partsById = new Map<string, CatalogPart>(
  [...boards, ...modules].map((part) => [part.id, part]),
);

export function listCatalog(): {
  boards: CatalogPart[];
  modules: CatalogPart[];
  recipes: Recipe[];
} {
  return { boards, modules, recipes };
}

export function getCatalogPart(id: string): CatalogPart | undefined {
  return partsById.get(id);
}

export function getRecipe(id: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === id);
}

export * from "./types";
