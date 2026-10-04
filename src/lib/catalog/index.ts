import { boards } from "./boards";
import { modules } from "./modules";
import { passives } from "./passives";
import { recipes } from "./recipes";
import type { CatalogPart, Recipe } from "./types";

const partsById = new Map<string, CatalogPart>(
  [...boards, ...modules, ...passives].map((part) => [part.id, part]),
);

export function listCatalog(): {
  boards: CatalogPart[];
  modules: CatalogPart[];
  passives: CatalogPart[];
  recipes: Recipe[];
} {
  return { boards, modules, passives, recipes };
}

export function getCatalogPart(id: string): CatalogPart | undefined {
  return partsById.get(id);
}

export function getRecipe(id: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === id);
}

export * from "./types";
