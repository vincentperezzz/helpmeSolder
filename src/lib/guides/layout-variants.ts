import { getCatalogPart } from "@/lib/catalog";
import type { Guide, GuideConnection, GuidePart } from "@/lib/catalog/types";
import { planPlug } from "@/components/wokwi/plug";
import { hasBreadboard } from "@/lib/guides/solder-plan";
import {
  buildNets,
  issueSeverity,
  validateGuide,
  type Net,
  type NetPin,
} from "@/lib/guides/validator";

const BREADBOARD_CATALOG_ID = "passive.breadboard.half";
const BB_COLUMNS = 30;
/** Holes a-e share one column half. */
const UPPER_ROWS = ["a", "b", "c", "d", "e"] as const;

export type BreadboardLayoutResult = {
  guide: Guide;
  /** Plain-words notes about nets that could not be placed on the breadboard. */
  warnings: string[];
};

function isBreadboardPart(part: GuidePart): boolean {
  return getCatalogPart(part.catalogId)?.id.includes("breadboard") ?? false;
}

/** True when at least one connection ends on a breadboard part. */
function usesBreadboard(guide: Guide): boolean {
  const boards = new Set(guide.parts.filter(isBreadboardPart).map((part) => part.instanceId));
  return guide.connections.some(
    (c) => boards.has(c.from.instanceId) || boards.has(c.to.instanceId),
  );
}

type NetKind = "ground" | "power" | "signal";

/** Passives like LEDs and resistors list loose pin kinds, so only boards, modules and supplies decide a net's role. */
function isAnchor(item: NetPin): boolean {
  return item.catalog.kind !== "passive" || item.catalog.id.startsWith("passive.power.");
}

function netKind(net: Net): NetKind {
  const anchors = net.pins.filter(isAnchor);
  if (anchors.some((item) => item.pin.kinds.includes("ground"))) return "ground";
  if (anchors.some((item) => item.pin.kinds.includes("power"))) return "power";
  return "signal";
}

function pinName(item: NetPin): string {
  return `${item.part.label ?? item.catalog.name} ${item.pin.label}`;
}

function uniqueInstanceId(guide: Guide, base: string): string {
  const taken = new Set(guide.parts.map((part) => part.instanceId));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** First column plugged parts may use; rail holes under a part stay free for the board jumpers. */
const FIRST_PART_COL = 2;
/** Holes a-d are for jumpers; row e is where plugged parts sit. */
const JUMPER_ROWS = ["a", "b", "c", "d"] as const;

type End = { instanceId: string; pinId: string };

/**
 * Rebuild the wiring the way it is done on a real breadboard. Parts with a
 * known drawing (buzzer, button, resistor, LED, a few header modules) plug
 * their own legs into row e of their own columns, so each leg owns a column
 * strip, and those plug-in links are marked `plug-N` (drawn as the part sitting
 * in the holes, not as a wire). Jumpers (`bb-N`) then go from the board pins to
 * a free hole of the right strip. Ground and power go to the rails: board pins
 * jump to a rail hole, and a part's ground or power leg jumps from its strip up
 * to the rail. A net that touches two strips gets a short bridge jumper. Other
 * parts keep a wire from each pin to a hole.
 * Returns the guide unchanged when its connections already run through a breadboard.
 */
export function toBreadboardLayoutWithWarnings(guide: Guide): BreadboardLayoutResult {
  if (hasBreadboard(guide)) {
    if (usesBreadboard(guide)) return { guide, warnings: [] };
    // The breadboard is listed but everything is wired straight across: lay it out properly.
    return toBreadboardLayoutWithWarnings({
      ...guide,
      parts: guide.parts.filter((part) => !isBreadboardPart(part)),
    });
  }

  const bbId = uniqueInstanceId(guide, "breadboard");
  const nets = buildNets(guide).filter((net) => net.pins.length >= 2);
  const warnings: string[] = [];
  const connections: GuideConnection[] = [];
  const pinKey = (item: NetPin) => `${item.part.instanceId}:${item.pin.id}`;
  const partEnd = (item: NetPin): End => ({
    instanceId: item.part.instanceId,
    pinId: item.pin.id,
  });
  const hole = (pinId: string): End => ({ instanceId: bbId, pinId });

  // Plug each pluggable part into its own columns.
  const stripOf = new Map<string, number>();
  const plugCols = new Set<number>();
  let nextCol = FIRST_PART_COL;
  for (const part of guide.parts) {
    const catalog = getCatalogPart(part.catalogId);
    if (!catalog || catalog.kind === "board") continue;
    const used = catalog.pins
      .filter((pin) =>
        nets.some((net) =>
          net.pins.some(
            (item) => item.part.instanceId === part.instanceId && item.pin.id === pin.id,
          ),
        ),
      )
      .map((pin) => pin.id);
    const plan = planPlug(part.catalogId, used);
    if (!plan) continue;
    const refCol = nextCol - plan.bodyLo;
    const lastCol = refCol + plan.bodyHi;
    if (lastCol > BB_COLUMNS) continue;
    for (const slot of plan.slots) {
      const col = refCol + slot.dcol;
      stripOf.set(`${part.instanceId}:${slot.pinId}`, col);
      plugCols.add(col);
      connections.push({
        id: `plug-${connections.length + 1}`,
        from: { instanceId: part.instanceId, pinId: slot.pinId },
        to: hole(`${slot.row}${col}`),
      });
    }
    nextCol = lastCol + 1;
  }

  const rowsTaken = new Map<number, number>();
  /** Next free jumper hole in a column strip, or null when the strip is full. */
  const takeHole = (col: number): string | null => {
    const index = rowsTaken.get(col) ?? 0;
    const rows = plugCols.has(col) ? JUMPER_ROWS : UPPER_ROWS;
    if (index >= rows.length) return null;
    rowsTaken.set(col, index + 1);
    return `${rows[index]}${col}`;
  };

  let jumpers = 0;
  const jump = (from: End, to: End, note?: string) => {
    jumpers += 1;
    connections.push({
      id: `bb-${jumpers}`,
      from,
      to,
      ...(note ? { note } : {}),
    });
  };

  const railCols = new Map<string, Set<number>>();
  /** Rail hole for a board jumper: left-most column not already used by a strip jumper. */
  const takeRailCol = (rail: string): number | null => {
    const taken = railCols.get(rail) ?? new Set<number>();
    railCols.set(rail, taken);
    for (let col = 1; col <= BB_COLUMNS; col += 1) {
      if (taken.has(col) || plugCols.has(col)) continue;
      taken.add(col);
      return col;
    }
    return null;
  };

  const groundRails = ["-.t", "-.b"];
  const powerRails = ["+.t", "+.b"];
  let groundUsed = 0;
  let powerUsed = 0;
  const looseSignals = nets.filter(
    (net) => netKind(net) === "signal" && !net.pins.every((item) => stripOf.has(pinKey(item))),
  ).length;
  const colStep = looseSignals <= 6 ? 2 : 1;
  let freeCol = nextCol;

  for (const net of nets) {
    const kind = netKind(net);
    const plugged = net.pins.filter((item) => stripOf.has(pinKey(item)));
    // Parts first, board last, so the board jumper is the last hole in the column.
    const loose = net.pins
      .filter((item) => !stripOf.has(pinKey(item)))
      .sort((a, b) => Number(a.catalog.kind === "board") - Number(b.catalog.kind === "board"));

    if (kind === "signal") {
      const strips = [...new Set(plugged.map((item) => stripOf.get(pinKey(item)) as number))];
      let hub = strips[0];
      if (hub === undefined) {
        hub = freeCol;
        if (hub > BB_COLUMNS || net.pins.length > UPPER_ROWS.length) {
          warnings.push(`Left off the breadboard: ${net.pins.map(pinName).join(", ")} (no room).`);
          continue;
        }
        freeCol += colStep;
      }
      for (const strip of strips.slice(1)) {
        const from = takeHole(strip);
        const to = takeHole(hub);
        if (from && to) jump(hole(from), hole(to));
        else warnings.push(`Left off the breadboard: a link between columns ${strip} and ${hub}.`);
      }
      for (const item of loose) {
        const target = takeHole(hub);
        if (target) jump(partEnd(item), hole(target));
        else warnings.push(`Left off the breadboard: ${pinName(item)} (column is full).`);
      }
      continue;
    }

    const used = kind === "ground" ? groundUsed : powerUsed;
    const rails = kind === "ground" ? groundRails : powerRails;
    if (used >= rails.length) {
      warnings.push(
        `Left off the breadboard: ${net.pins.map(pinName).join(", ")} (only two ${kind} rails).`,
      );
      continue;
    }
    if (kind === "ground") groundUsed += 1;
    else powerUsed += 1;
    const rail = rails[used];
    const note = kind === "ground" ? "− ground rail" : "+ power rail";
    for (const item of plugged) {
      const col = stripOf.get(pinKey(item)) as number;
      const from = takeHole(col);
      if (!from) {
        warnings.push(`Left off the breadboard: ${pinName(item)} (column is full).`);
        continue;
      }
      jump(hole(from), hole(`${rail}.${col}`), note);
    }
    for (const item of loose) {
      const col = takeRailCol(rail);
      if (col === null) {
        warnings.push(`Left off the breadboard: ${pinName(item)} (rail is full).`);
        continue;
      }
      jump(partEnd(item), hole(`${rail}.${col}`), note);
    }
  }

  const breadboard: GuidePart = {
    instanceId: bbId,
    catalogId: BREADBOARD_CATALOG_ID,
    label: "Breadboard",
  };
  return {
    guide: { ...guide, parts: [...guide.parts, breadboard], connections },
    warnings,
  };
}

export function toBreadboardLayout(guide: Guide): Guide {
  return toBreadboardLayoutWithWarnings(guide).guide;
}

/**
 * Replace breadboards with direct wires. Each net becomes hub and spoke: every
 * pin connects to one hub pin, preferring a board pin.
 */
export function toDirectLayout(guide: Guide): Guide {
  if (!hasBreadboard(guide)) return guide;
  const connections: GuideConnection[] = [];
  for (const net of buildNets(guide)) {
    if (net.pins.length < 2) continue;
    const hub = net.pins.find((item) => item.catalog.kind === "board") ?? net.pins[0];
    for (const item of net.pins) {
      if (item === hub) continue;
      connections.push({
        id: `direct-${connections.length + 1}`,
        from: { instanceId: hub.part.instanceId, pinId: hub.pin.id },
        to: { instanceId: item.part.instanceId, pinId: item.pin.id },
      });
    }
  }
  return {
    ...guide,
    parts: guide.parts.filter((part) => !isBreadboardPart(part)),
    connections,
  };
}

/**
 * New validation errors that a layout change introduces. Hole pins are
 * generic signal pins, so "incompatible pins" about them is not a real fault.
 */
export function layoutFeedback(before: Guide, after: Guide): string[] {
  if (before === after) return [];
  const known = new Set(
    validateGuide(before).issues.map((issue) => `${issue.code}|${issue.message}`),
  );
  return validateGuide(after)
    .issues.filter(
      (issue) =>
        issue.code !== "power_source_required" &&
        issue.code !== "incompatible_pins" &&
        issueSeverity(issue) === "error" &&
        !known.has(`${issue.code}|${issue.message}`),
    )
    .map((issue) => issue.message);
}
