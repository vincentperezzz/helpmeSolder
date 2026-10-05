import { getCatalogPart } from "@/lib/catalog";
import type { CatalogPart, Guide, GuideConnection, PinKind } from "@/lib/catalog/types";
import { assignWireColors } from "@/components/wokwi/labels";
import { isBatteryPowerSource } from "./power-source";

export type WireKind = "ground" | "power" | "signal";

export type WireEnd = {
  /** Part name as the beginner sees it, e.g. "Buzzer". */
  part: string;
  /** Pin as printed on the part, e.g. "pin 1 (SIG)". */
  pin: string;
};

export type WireItem = {
  id: string;
  from: WireEnd;
  to: WireEnd;
  /** "Buzzer, pin 1 (SIG) to ESP32 DevKit V1, pin D13" */
  sentence: string;
  /** Hex colour the diagram draws for this wire. */
  color: string;
  /** Plain colour name, e.g. "red". */
  colorName: string;
  kind: WireKind;
  /** Short plain-language reason, or null when it cannot be derived. */
  why: string | null;
  note?: string;
};

const COLOR_NAMES: Record<string, string> = {
  "#212121": "black",
  "#c62828": "red",
  "#1565c0": "blue",
  "#2e7d32": "green",
  "#ef6c00": "orange",
  "#6a1b9a": "purple",
  "#00838f": "teal",
  "#546e7a": "grey",
  "#ad1457": "pink",
  "#795548": "brown",
  "#f9a825": "yellow",
};

export function colorName(hex: string): string {
  return COLOR_NAMES[hex.toLowerCase()] ?? "coloured";
}

type Resolved = {
  part: CatalogPart | undefined;
  name: string;
  pinLabel: string;
  pinPhrase: string;
  kinds: PinKind[];
};

function isBreadboard(part: CatalogPart | undefined): boolean {
  return Boolean(part?.id.startsWith("passive.breadboard"));
}

function resolveEnd(
  guide: Guide,
  end: { instanceId: string; pinId: string },
): Resolved {
  const instance = guide.parts.find((p) => p.instanceId === end.instanceId);
  const part = instance ? getCatalogPart(instance.catalogId) : undefined;
  const name = instance?.label?.trim() || part?.name || end.instanceId;
  const pin = part?.pins.find((p) => p.id === end.pinId);
  const pinLabel = pin?.label || end.pinId;
  let pinPhrase = `pin ${pinLabel}`;
  if (isBreadboard(part)) {
    pinPhrase = /^[+−-]/.test(pinLabel) ? `the ${pinLabel}` : `hole ${pinLabel}`;
  }
  return { part, name, pinLabel, pinPhrase, kinds: pin?.kinds ?? [] };
}

function classify(a: Resolved, b: Resolved): WireKind {
  const kinds = [...a.kinds, ...b.kinds];
  if (kinds.includes("ground")) return "ground";
  if (kinds.includes("power")) return "power";
  return "signal";
}

function whyFor(kind: WireKind, a: Resolved, b: Resolved): string | null {
  if (kind === "ground") return "Ground: completes the circuit. Without it nothing works.";
  if (kind === "power") return "Power: this wire carries the supply voltage to the part.";
  const all = [...a.kinds, ...b.kinds];
  if (all.includes("i2c")) return "Data: a two-wire link the board uses to talk to the part.";
  if (all.includes("spi")) return "Data: a fast link the board uses to talk to the part.";
  if (all.includes("uart")) return "Data: a serial link the board uses to talk to the part.";
  if (all.includes("analog")) return "Signal: the board reads a varying level from this wire.";
  if (all.includes("digital")) return "Signal: the board switches or reads this wire on and off.";
  return null;
}

const RANK: Record<WireKind, number> = { ground: 0, power: 1, signal: 2 };

/** Ordered wire list: ground and power first, then signals. Original order is kept within a group. */
export function buildSolderItems(guide: Guide): WireItem[] {
  const ends = guide.connections.map((connection: GuideConnection) => ({
    from: resolveEnd(guide, connection.from),
    to: resolveEnd(guide, connection.to),
  }));
  // Same labels the diagram feeds assignWireColors, so swatches match the picture.
  const colors = assignWireColors(
    guide.connections.map(
      (connection, index) =>
        connection.note || `${ends[index].from.pinLabel} → ${ends[index].to.pinLabel}`,
    ),
  );
  const items = guide.connections.map((connection: GuideConnection, index) => {
    const { from, to } = ends[index];
    const color = colors[index];
    const kind = classify(from, to);
    return {
      index,
      item: {
        id: connection.id,
        from: { part: from.name, pin: from.pinPhrase },
        to: { part: to.name, pin: to.pinPhrase },
        sentence: `${from.name}, ${from.pinPhrase} to ${to.name}, ${to.pinPhrase}`,
        color,
        colorName: colorName(color),
        kind,
        why: whyFor(kind, from, to),
        note: connection.note,
      } satisfies WireItem,
    };
  });
  return items
    .sort((a, b) => RANK[a.item.kind] - RANK[b.item.kind] || a.index - b.index)
    .map((entry) => entry.item);
}

const BATTERY_NAMES: Record<string, string> = {
  battery_9v: "9V battery",
  battery_2aa: "2xAA battery holder",
  battery_3aa: "3xAA battery holder",
  battery_18650: "18650 battery",
};

function powerInPin(board: CatalogPart | undefined): string | null {
  if (!board) return null;
  for (const wanted of ["VIN", "VSYS", "VBUS", "5V"]) {
    const pin = board.pins.find(
      (p) => p.kinds.includes("power") && p.label.toUpperCase() === wanted,
    );
    if (pin) return pin.label;
  }
  return null;
}

/** One plain-words power line, or null when the power source is not chosen yet. */
export function describePower(guide: Guide): string | null {
  const source = guide.power_source;
  if (!source) return null;
  const board = guide.board_id ? getCatalogPart(guide.board_id) : undefined;
  const boardName = board?.name ?? "the board";

  if (source === "usb_wall") {
    const isPi = board?.id.startsWith("board.pi.") ?? false;
    const port = isPi ? "power port" : "USB port";
    return `Plug a USB cable from a phone charger into the board's ${port}. No soldering needed for power.`;
  }

  if (isBatteryPowerSource(source)) {
    const battery = BATTERY_NAMES[source] ?? "battery";
    const pin = powerInPin(board);
    const plusTarget = pin ? `the ${boardName} ${pin} pin` : "the board's power-in pin";
    return `Power the board from a ${battery}. The + (red) wire goes to ${plusTarget} and the - (black) wire goes to GND. Never reverse them, and connect the battery last.`;
  }
  return null;
}

export type SolderPlan = {
  power: string | null;
  items: WireItem[];
};

export function buildSolderPlan(guide: Guide): SolderPlan {
  return { power: describePower(guide), items: buildSolderItems(guide) };
}

/** True when the guide has a breadboard, so wiring there needs no soldering. */
export function hasBreadboard(guide: Guide): boolean {
  return guide.parts.some((p) => isBreadboard(getCatalogPart(p.catalogId)));
}
