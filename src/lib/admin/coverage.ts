import { getDiagramAsset } from "@/lib/catalog/board-assets";
import { listCatalog } from "@/lib/catalog";
import { resolvePartPhoto } from "@/lib/catalog/part-media";
import type { CatalogPart, Recipe } from "@/lib/catalog/types";
import { hasWokwiVisual } from "@/lib/catalog/wokwi";

export type CatalogInput = {
  boards: CatalogPart[];
  modules: CatalogPart[];
  passives: CatalogPart[];
  recipes: Recipe[];
};

export type CoverageRow = {
  id: string;
  name: string;
  /** Family for boards, simple category for modules and basic parts. */
  group: string;
  /** Logic voltage as text, or "unknown". */
  logic: string;
  hasDrawing: boolean;
  hasThumbnail: boolean;
};

export type CoverageGroup = { group: string; rows: CoverageRow[] };

export type CoverageReport = {
  boards: CoverageRow[];
  moduleGroups: CoverageGroup[];
  modules: CoverageRow[];
  basicParts: CoverageRow[];
  recipeCount: number;
  missing: CoverageRow[];
  percent: { drawing: number; thumbnail: number };
  total: number;
};

export function boardFamily(id: string): string {
  if (id.startsWith("board.arduino")) return "Arduino";
  if (id.startsWith("board.pico")) return "Raspberry Pi Pico";
  if (id.startsWith("board.pi.")) return "Raspberry Pi";
  if (id.startsWith("board.esp")) return "ESP";
  return "Other";
}

const MODULE_CATEGORIES: [RegExp, string][] = [
  [/\.(lcd|oled|tft)\b/, "Displays"],
  [/\.(7segment|led\.bar|neopixel|rgb-led|led\.ring)/, "Lights and LED displays"],
  [/\.(servo|stepper|biaxial|relay|buzzer)/, "Motors, relays and sound output"],
  [/\.(joystick|ky\.040|keypad|slide|dip\.switch|tilt)/, "Inputs and switches"],
  [/\.(microsd|ds1307)/, "Storage and time"],
  [/\.(soil|dht|hc-sr04|pir|photoresistor|ntc|flame|gas|mpu|hx711|heart|sound|ir\.receiver)/, "Sensors"],
];

export function moduleCategory(id: string): string {
  return MODULE_CATEGORIES.find(([pattern]) => pattern.test(id))?.[1] ?? "Other modules";
}

export function basicCategory(id: string): string {
  if (id.startsWith("passive.power.")) return "Power sources";
  if (id.startsWith("passive.resistor")) return "Resistors";
  if (id.startsWith("passive.led")) return "LEDs";
  if (id.startsWith("passive.breadboard")) return "Breadboards";
  return "Other basic parts";
}

export function logicLabel(part: CatalogPart): string {
  const logic = part.electrical?.logic;
  if (logic === "3v3") return "3.3 V";
  if (logic === "5v") return "5 V";
  return "unknown";
}

function toRow(part: CatalogPart, group: string): CoverageRow {
  return {
    id: part.id,
    name: part.name,
    group,
    logic: logicLabel(part),
    hasDrawing: hasWokwiVisual(part) || Boolean(getDiagramAsset(part.id)),
    hasThumbnail: resolvePartPhoto(part.photoHint) !== null,
  };
}

export function groupRows(rows: CoverageRow[]): CoverageGroup[] {
  const map = new Map<string, CoverageRow[]>();
  for (const row of rows) {
    map.set(row.group, [...(map.get(row.group) ?? []), row]);
  }
  return [...map.entries()]
    .map(([group, list]) => ({ group, rows: list }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

export function percentOf(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

export function buildCoverage(catalog: CatalogInput = listCatalog()): CoverageReport {
  const boards = catalog.boards.map((p) => toRow(p, boardFamily(p.id)));
  const modules = catalog.modules.map((p) => toRow(p, moduleCategory(p.id)));
  const basicParts = catalog.passives.map((p) => toRow(p, basicCategory(p.id)));
  const all = [...boards, ...modules, ...basicParts];
  const withDrawing = all.filter((r) => r.hasDrawing).length;
  const withThumbnail = all.filter((r) => r.hasThumbnail).length;

  return {
    boards,
    modules,
    moduleGroups: groupRows(modules),
    basicParts,
    recipeCount: catalog.recipes.length,
    missing: all.filter((r) => !r.hasDrawing || !r.hasThumbnail),
    percent: {
      drawing: percentOf(withDrawing, all.length),
      thumbnail: percentOf(withThumbnail, all.length),
    },
    total: all.length,
  };
}
