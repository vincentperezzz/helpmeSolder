export type CircuitView = "parts" | "schematic";

const viewKey = (guideId: string) => `helpmesolder:circuit-view:${guideId}`;
const printSchematicKey = (guideId: string) => `helpmesolder:print-schematic:${guideId}`;

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
    // Storage blocked: the choice still works for this visit.
  }
}

export function readPrintSchematic(guideId: string): boolean {
  try {
    return window.localStorage.getItem(printSchematicKey(guideId)) === "on";
  } catch {
    return false;
  }
}

export function writePrintSchematic(guideId: string, value: boolean) {
  try {
    if (value) window.localStorage.setItem(printSchematicKey(guideId), "on");
    else window.localStorage.removeItem(printSchematicKey(guideId));
  } catch {
    // Storage blocked: the choice still works for this visit.
  }
}
