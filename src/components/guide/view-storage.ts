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

export const PRINT_GROUPS: readonly { label: string; sections: readonly PrintSection[] }[] = [
  { label: "Picture", sections: ["diagram", "schematic"] },
  { label: "Guide", sections: ["parts", "tools", "solder", "steps", "notes", "checks"] },
];

export function setAllPrintOptions(value: boolean): PrintOptions {
  return Object.fromEntries(PRINT_SECTIONS.map((key) => [key, value])) as PrintOptions;
}

export const PRINT_PAPERS = ["letter", "long", "a4"] as const;

export type PrintPaper = (typeof PRINT_PAPERS)[number];

export const DEFAULT_PRINT_PAPER: PrintPaper = "letter";

export const PRINT_PAPER_LABELS: Record<PrintPaper, string> = {
  letter: "Letter",
  long: "Long",
  a4: "A4",
};

export const PRINT_PICTURE_WIDTH = 680;

const PRINT_MARGIN_MM = 12;

export function printPageWidthMm(paper: PrintPaper): number {
  return paper === "a4" ? 210 : 8.5 * 25.4;
}

export function printContentWidthMm(paper: PrintPaper): number {
  return printPageWidthMm(paper) - PRINT_MARGIN_MM * 2;
}

export function printPictureWidth(paper: PrintPaper): number {
  const letter = printContentWidthMm("letter");
  return (PRINT_PICTURE_WIDTH * printContentWidthMm(paper)) / letter;
}

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
const printPaperKey = (guideId: string) => `helpmesolder:print-paper:${guideId}`;

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

export function readPrintPaper(guideId: string): PrintPaper {
  try {
    const raw = window.localStorage.getItem(printPaperKey(guideId));
    return raw === "long" || raw === "a4" ? raw : "letter";
  } catch {
    return "letter";
  }
}

export function writePrintPaper(guideId: string, paper: PrintPaper) {
  try {
    if (paper === "letter") window.localStorage.removeItem(printPaperKey(guideId));
    else window.localStorage.setItem(printPaperKey(guideId), paper);
  } catch {
  }
}

export function readPrintSchematic(guideId: string): boolean {
  return readPrintOptions(guideId).schematic;
}

export function writePrintSchematic(guideId: string, value: boolean) {
  writePrintOptions(guideId, { ...readPrintOptions(guideId), schematic: value });
}
