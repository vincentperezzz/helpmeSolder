import { getCatalogPart } from "@/lib/catalog";
import type { Guide, GuideConnection, GuidePart } from "@/lib/catalog/types";
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

/**
 * Rewire every net through one half-size breadboard, the way a beginner would:
 * ground pins to a minus rail, power pins to a plus rail, and each signal net
 * gets its own column (all of its pins plug into holes of that column half).
 * Returns the guide unchanged when it already has a breadboard.
 */
export function toBreadboardLayoutWithWarnings(guide: Guide): BreadboardLayoutResult {
  if (hasBreadboard(guide)) return { guide, warnings: [] };

  const bbId = uniqueInstanceId(guide, "breadboard");
  const nets = buildNets(guide);
  const warnings: string[] = [];
  const connections: GuideConnection[] = [];

  const groundRails = ["-.t", "-.b"];
  const powerRails = ["+.t", "+.b"];
  let groundUsed = 0;
  let powerUsed = 0;
  const railNext = new Map<string, number>();

  const signalNets = nets.filter((net) => netKind(net) === "signal" && net.pins.length >= 2);
  const colStep = signalNets.length <= 14 ? 2 : 1;
  let signalIndex = 0;

  const add = (item: NetPin, pinId: string, note?: string) => {
    connections.push({
      id: `bb-${connections.length + 1}`,
      from: { instanceId: item.part.instanceId, pinId: item.pin.id },
      to: { instanceId: bbId, pinId },
      ...(note ? { note } : {}),
    });
  };

  for (const net of nets) {
    if (net.pins.length < 2) continue;
    const kind = netKind(net);
    if (kind === "signal") {
      const col = 2 + signalIndex * colStep;
      if (col > BB_COLUMNS || net.pins.length > UPPER_ROWS.length) {
        warnings.push(
          `Left off the breadboard: ${net.pins.map(pinName).join(", ")} (no room).`,
        );
        continue;
      }
      signalIndex += 1;
      // Parts first, board last, so the board jumper is the last hole in the column.
      const ordered = [
        ...net.pins.filter((item) => item.catalog.kind !== "board"),
        ...net.pins.filter((item) => item.catalog.kind === "board"),
      ];
      ordered.forEach((item, index) => add(item, `${UPPER_ROWS[index]}${col}`));
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
    for (const item of net.pins) {
      const next = (railNext.get(rail) ?? 0) + 1;
      railNext.set(rail, next);
      if (next > BB_COLUMNS) {
        warnings.push(`Left off the breadboard: ${pinName(item)} (rail is full).`);
        continue;
      }
      add(item, `${rail}.${next}`, note);
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
