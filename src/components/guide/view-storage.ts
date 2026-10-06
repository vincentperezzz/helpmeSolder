export type CircuitView = "parts" | "schematic";

export const PRINT_SECTIONS = [
  "diagram",
  "schematic",
  "parts",
  "tools",
  "solder",
  "steps",
  "notes",
  "checks",
] as const;

export type PrintSection = (typeof PRINT_SECTIONS)[number];

export type PrintOptions = Record<PrintSection, boolean>;

export const PRINT_SECTION_LABELS: Record<PrintSection, string> = {
  diagram: "Wiring diagram",
  schematic: "Circuit schematic",
  parts: "Parts",
  tools: "Tools",
  solder: "Solder checklist",
  steps: "Steps",
  notes: "Notes",
  checks: "Warnings",
};

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  diagram: true,
  schematic: false,
  parts: true,
  tools: true,
  solder: true,
  steps: true,
  notes: true,
  checks: true,
};

const viewKey = (guideId: string) => `helpmesolder:circuit-view:${guideId}`;
const printSchematicKey = (guideId: string) => `helpmesolder:print-schematic:${guideId}`;
const printOptionsKey = (guideId: string) => `helpmesolder:print-options:${guideId}`;

export function readView(guideId: string): CircuitView {
  try {
    return window.localStorage.getItem(viewKey(guideId)) === "schematic" ? "schematic" : "parts";
  } catch {
    return "parts";
  }
}

export function writeView(guideId: string, view: CircuitView) {
  try {
    if (view === "parts") window.localStorage.removeItem(viewKey(guideId));
    else window.localStorage.setItem(viewKey(guideId), view);
  } catch {
  }
}

function parsePrintOptions(raw: string | null): PrintOptions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<PrintSection, unknown>>;
    if (!parsed || typeof parsed !== "object") return null;
    const next = { ...DEFAULT_PRINT_OPTIONS };
    for (const key of PRINT_SECTIONS) {
      if (typeof parsed[key] === "boolean") next[key] = parsed[key];
    }
    return next;
  } catch {
    return null;
  }
}

export function readPrintOptions(guideId: string): PrintOptions {
  try {
    const fromOptions = parsePrintOptions(window.localStorage.getItem(printOptionsKey(guideId)));
    if (fromOptions) return fromOptions;
    const legacy = window.localStorage.getItem(printSchematicKey(guideId)) === "on";
    return { ...DEFAULT_PRINT_OPTIONS, schematic: legacy };
  } catch {
    return { ...DEFAULT_PRINT_OPTIONS };
  }
}

export function writePrintOptions(guideId: string, options: PrintOptions) {
  try {
    window.localStorage.setItem(printOptionsKey(guideId), JSON.stringify(options));
    if (options.schematic) window.localStorage.setItem(printSchematicKey(guideId), "on");
    else window.localStorage.removeItem(printSchematicKey(guideId));
  } catch {
  }
}

export function readPrintSchematic(guideId: string): boolean {
  return readPrintOptions(guideId).schematic;
}

export function writePrintSchematic(guideId: string, value: boolean) {
  writePrintOptions(guideId, { ...readPrintOptions(guideId), schematic: value });
}
