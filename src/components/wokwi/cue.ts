import { getCatalogPart } from "@/lib/catalog";
import type { Guide } from "@/lib/catalog/types";
import { isBreadboardId } from "./breadboard";

export function buildCue(guide: Guide): string {
  const board = guide.board_id ? getCatalogPart(guide.board_id) : null;
  const hasBreadboard = guide.parts.some((part) => isBreadboardId(part.catalogId));
  const hasLed = guide.parts.some((part) => part.catalogId.includes(".led."));
  const hasResistor = guide.parts.some((part) => part.catalogId.includes("resistor"));
  if (hasBreadboard && hasLed && hasResistor) {
    return `Building: ${board?.name ?? "board"} blinks an LED through a breadboard + resistor`;
  }
  if (guide.title) return `Building: ${guide.title}`;
  return "Building: wiring prototype";
}
