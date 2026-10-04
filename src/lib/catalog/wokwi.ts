import type { CatalogPart } from "./types";

export type WokwiPlacement = {
  instanceId: string;
  catalogId: string;
  tag: string;
  attrs: Record<string, string>;
  x: number;
  y: number;
};

export function hasWokwiVisual(part: CatalogPart | undefined): boolean {
  return Boolean(part?.wokwi?.tag);
}

export function wokwiAttrs(part: CatalogPart): Record<string, string> {
  return { ...(part.wokwi?.attrs ?? {}) };
}
