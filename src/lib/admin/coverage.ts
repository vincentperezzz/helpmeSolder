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
  /** Id of the catalog category this part belongs to. */
  categoryId: CategoryId;
};

export type CategoryId =
  | "microcontrollers"
  | "displays"
  | "lights"
  | "sensors"
  | "inputs"
  | "motors"
  | "storage"
  | "resistors"
  | "power"
  | "other";

export type CategoryDef = { id: CategoryId; label: string; description: string };

export const CATEGORIES: CategoryDef[] = [
  { id: "microcontrollers", label: "Microcontrollers", description: "Boards that run your code: Arduino, ESP, Raspberry Pi Pico and Raspberry Pi." },
  { id: "displays", label: "Displays", description: "Screens that show text or pictures: LCD, OLED and TFT." },
  { id: "lights", label: "Lights", description: "LEDs, NeoPixels, LED bars, 7-segment displays and RGB LEDs." },
  { id: "sensors", label: "Sensors", description: "Parts that measure the world: temperature, distance, motion, light and sound." },
  { id: "inputs", label: "Inputs", description: "Buttons, switches, joysticks, encoders, keypads and potentiometers." },
  { id: "motors", label: "Motors and relays", description: "Servos, steppers, relays and buzzers that move or switch things." },
  { id: "storage", label: "Storage and time", description: "MicroSD card readers and real-time clocks." },
  { id: "resistors", label: "Resistors", description: "Fixed resistors in the common values." },
  { id: "power", label: "Power", description: "USB adapters and batteries that supply power." },
  { id: "other", label: "Other basic parts", description: "Breadboards and any part that fits no other category." },
];

export type CategoryCoverage = CategoryDef & {
  rows: CoverageRow[];
  count: number;
  drawings: number;
  thumbnails: number;
  percent: { drawing: number; thumbnail: number };
  /** Parts missing a thumbnail. A part without a dedicated drawing still shows as a generic box in the diagram. */
  missing: number;
};

export type CoverageGroup = { group: string; rows: CoverageRow[] };

export type CoverageReport = {
  boards: CoverageRow[];
  moduleGroups: CoverageGroup[];
  modules: CoverageRow[];
  basicParts: CoverageRow[];
  recipeCount: number;
  missing: CoverageRow[];
  categories: CategoryCoverage[];
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

const MODULE_CATEGORY_IDS: [RegExp, CategoryId][] = [
  [/\.(lcd|oled|tft)\b/, "displays"],
  [/\.(7segment|led\.bar|neopixel|rgb-led|led\.ring)/, "lights"],
  [/\.(servo|stepper|biaxial|relay|buzzer)/, "motors"],
  [/\.(joystick|ky\.040|keypad|slide|dip\.switch|tilt)/, "inputs"],
  [/\.(microsd|ds1307)/, "storage"],
  [/\.(soil|dht|hc-sr04|pir|photoresistor|ntc|flame|gas|mpu|hx711|heart|sound|ir\.receiver)/, "sensors"],
];

/** The single catalog category for a part. Anything unknown lands in "other". */
export function categoryOf(kind: "board" | "module" | "passive", id: string): CategoryId {
  if (kind === "board") return "microcontrollers";
  if (kind === "passive") {
    if (id.startsWith("passive.power.")) return "power";
    if (id.includes("resistor") && !id.startsWith("passive.potentiometer")) return "resistors";
    if (id.startsWith("passive.led")) return "lights";
    if (id.startsWith("passive.pushbutton") || id.startsWith("passive.potentiometer")) return "inputs";
    return "other";
  }
  return MODULE_CATEGORY_IDS.find(([pattern]) => pattern.test(id))?.[1] ?? "other";
}

export function logicLabel(part: CatalogPart): string {
  const logic = part.electrical?.logic;
  if (logic === "3v3") return "3.3 V";
  if (logic === "5v") return "5 V";
  return "unknown";
}

/** Parts the diagram draws itself (power sources and the breadboard), without a Wokwi element. */
export function hasBuiltInDrawing(id: string): boolean {
  return id.startsWith("passive.power.") || id.startsWith("passive.breadboard");
}

function toRow(
  part: CatalogPart,
  group: string,
  kind: "board" | "module" | "passive",
): CoverageRow {
  return {
    id: part.id,
    name: part.name,
    group,
    logic: logicLabel(part),
    hasDrawing:
      hasWokwiVisual(part) || Boolean(getDiagramAsset(part.id)) || hasBuiltInDrawing(part.id),
    hasThumbnail: resolvePartPhoto(part.photoHint) !== null,
    categoryId: categoryOf(kind, part.id),
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
  const boards = catalog.boards.map((p) => toRow(p, boardFamily(p.id), "board"));
  const modules = catalog.modules.map((p) => toRow(p, moduleCategory(p.id), "module"));
  const basicParts = catalog.passives.map((p) => toRow(p, basicCategory(p.id), "passive"));
  const all = [...boards, ...modules, ...basicParts];
  const withDrawing = all.filter((r) => r.hasDrawing).length;
  const withThumbnail = all.filter((r) => r.hasThumbnail).length;

  return {
    boards,
    modules,
    moduleGroups: groupRows(modules),
    basicParts,
    recipeCount: catalog.recipes.length,
    categories: CATEGORIES.map((def) => {
      const rows = all.filter((r) => r.categoryId === def.id);
      const drawings = rows.filter((r) => r.hasDrawing).length;
      const thumbnails = rows.filter((r) => r.hasThumbnail).length;
      return {
        ...def,
        rows,
        count: rows.length,
        drawings,
        thumbnails,
        percent: { drawing: percentOf(drawings, rows.length), thumbnail: percentOf(thumbnails, rows.length) },
        missing: rows.filter((r) => !r.hasThumbnail).length,
      };
    }),
    missing: all.filter((r) => !r.hasThumbnail),
    percent: {
      drawing: percentOf(withDrawing, all.length),
      thumbnail: percentOf(withThumbnail, all.length),
    },
    total: all.length,
  };
}
