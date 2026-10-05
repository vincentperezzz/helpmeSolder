import { getCatalogPart } from "@/lib/catalog";
import type { CatalogPart, CatalogPin, Guide } from "@/lib/catalog/types";
import type { SchematicNet } from "./types";

type PinRef = { instanceId: string; pinId: string };

export type NetModel = {
  nets: SchematicNet[];
  /** Net id for a real (non-breadboard) pin, or undefined when the pin is on no net. */
  netOfPin: (instanceId: string, pinId: string) => string | undefined;
  /** Catalog part for each guide instance that exists in the catalog. */
  catalog: Map<string, CatalogPart>;
  /** Instance ids of breadboard parts. */
  breadboards: Set<string>;
};

export function isBreadboardCatalogId(catalogId: string): boolean {
  return catalogId.startsWith("passive.breadboard");
}

export function pinKey(instanceId: string, pinId: string): string {
  return `${instanceId}\u0000${pinId}`;
}

/**
 * Breadboard pin id to the metal strip it sits on. Rails run the whole length, columns a-e
 * and f-j are separate strips. Returns null for ids that are not a rail or a hole.
 */
function breadboardStrip(pinId: string): string | null {
  if (pinId === "+" || pinId === "+.t") return "rail:t+";
  if (pinId === "-" || pinId === "-.b") return "rail:b-";
  if (pinId === "-.t") return "rail:t-";
  if (pinId === "+.b") return "rail:b+";
  const rail = /^([+-])\.(t|b)\.\d+$/i.exec(pinId);
  if (rail) return `rail:${rail[2].toLowerCase()}${rail[1]}`;
  const hole = /^([a-j])(\d+)$/i.exec(pinId);
  if (!hole) return null;
  const half = hole[1].toLowerCase() <= "e" ? "top" : "bot";
  return `col:${Number(hole[2])}:${half}`;
}

class UnionFind {
  private parent = new Map<string, string>();

  add(key: string) {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }

  find(key: string): string {
    let root = key;
    while (this.parent.get(root) !== root) root = this.parent.get(root) as string;
    let cursor = key;
    while (cursor !== root) {
      const next = this.parent.get(cursor) as string;
      this.parent.set(cursor, root);
      cursor = next;
    }
    return root;
  }

  union(a: string, b: string) {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

const SUPPLY_IDS = /^(3V3|5V|VIN|VCC|VDD)$/i;

function isPowerSourcePart(catalogId: string): boolean {
  return catalogId.startsWith("passive.power.");
}

/** Strong pins decide a net's kind. Pins of plain passives (resistor, LED) only count as a fallback. */
function isStrongPart(part: CatalogPart): boolean {
  return part.kind !== "passive" || isPowerSourcePart(part.id);
}

function volts(nominal: number): string {
  if (Math.abs(nominal - 3.3) < 0.05) return "3V3";
  return `${Number(nominal.toFixed(2))}V`;
}

function supplyLabel(part: CatalogPart, pin: CatalogPin): string | null {
  const named = [pin.id, pin.label].find((text) => SUPPLY_IDS.test(text.trim()));
  if (named) return named.trim().toUpperCase();
  const label = /^(3V3|5V)/i.exec(pin.label.trim());
  if (label) return label[1].toUpperCase();
  const source = part.electrical?.pins?.[pin.id]?.source;
  if (source) return volts(source.nominal);
  if (pin.voltage === "3v3") return "3V3";
  if (pin.voltage === "5v") return "5V";
  return null;
}

type NetPin = { ref: PinRef; part: CatalogPart; pin: CatalogPin };

function netKind(
  pins: NetPin[],
  hasBreadboardGround: boolean,
  hasBreadboardPower: boolean,
): SchematicNet["kind"] {
  let strongGround = hasBreadboardGround;
  let weakGround = false;
  let strongPower = hasBreadboardPower;
  let driver = false;
  for (const { part, pin } of pins) {
    const strong = isStrongPart(part);
    const ground = pin.kinds.includes("ground");
    const power = pin.kinds.includes("power");
    if (ground) {
      if (strong) strongGround = true;
      else weakGround = true;
    } else if (power && (strong || part.electrical?.pins?.[pin.id]?.source)) {
      strongPower = true;
    }
    if (strong && !ground && !power) driver = true;
  }
  if (strongGround || (weakGround && !driver && !strongPower)) return "ground";
  return strongPower ? "power" : "signal";
}

function netLabel(kind: SchematicNet["kind"], pins: NetPin[]): string {
  if (kind === "ground") return "GND";
  if (kind === "signal") {
    const pick =
      pins.find((entry) => entry.part.kind === "board") ??
      pins.find((entry) => entry.part.kind === "module") ??
      pins[0];
    return pick ? pick.pin.label : "";
  }
  const named = pins.find((entry) => SUPPLY_IDS.test(entry.pin.id) || SUPPLY_IDS.test(entry.pin.label.trim()));
  if (named) return supplyLabel(named.part, named.pin) ?? "VCC";
  for (const entry of pins) {
    if (!entry.pin.kinds.includes("power")) continue;
    const label = supplyLabel(entry.part, entry.pin);
    if (label) return label;
  }
  return "VCC";
}

/**
 * Builds the electrical nets of a guide. Breadboards are transparent: holes on the same strip
 * are one node, so board -> breadboard -> LED collapses to a net holding the board and LED pins.
 * Connections that touch unknown parts, unknown pins or parts missing from the catalog are ignored.
 * A net is kept when it holds two or more real pins, or when it is a ground or power net.
 */
export function buildNetModel(guide: Guide): NetModel {
  const catalog = new Map<string, CatalogPart>();
  const breadboards = new Set<string>();
  for (const part of guide.parts) {
    const found = getCatalogPart(part.catalogId);
    if (!found) continue;
    catalog.set(part.instanceId, found);
    if (isBreadboardCatalogId(found.id)) breadboards.add(part.instanceId);
  }

  const forest = new UnionFind();
  const realPins = new Map<string, NetPin>();
  const nodeOf = (ref: PinRef): string | null => {
    const part = catalog.get(ref.instanceId);
    if (!part) return null;
    if (breadboards.has(ref.instanceId)) {
      const strip = breadboardStrip(ref.pinId);
      return strip ? `bb\u0000${ref.instanceId}\u0000${strip}` : null;
    }
    const pin = part.pins.find((candidate) => candidate.id === ref.pinId);
    if (!pin) return null;
    const key = pinKey(ref.instanceId, ref.pinId);
    if (!realPins.has(key)) realPins.set(key, { ref: { ...ref }, part, pin });
    return key;
  };

  const used: { id: string; from: string; to: string }[] = [];
  for (const connection of guide.connections) {
    const from = nodeOf(connection.from);
    const to = nodeOf(connection.to);
    if (!from || !to) continue;
    forest.union(from, to);
    used.push({ id: connection.id, from, to });
  }

  const groups = new Map<string, { pins: NetPin[]; connectionIds: string[]; bbGround: boolean; bbPower: boolean }>();
  const order: string[] = [];
  const group = (root: string) => {
    let entry = groups.get(root);
    if (!entry) {
      entry = { pins: [], connectionIds: [], bbGround: false, bbPower: false };
      groups.set(root, entry);
      order.push(root);
    }
    return entry;
  };

  for (const link of used) {
    const entry = group(forest.find(link.from));
    entry.connectionIds.push(link.id);
    for (const node of [link.from, link.to]) {
      const real = realPins.get(node);
      if (real) {
        if (!entry.pins.some((existing) => existing.ref.instanceId === real.ref.instanceId && existing.ref.pinId === real.ref.pinId)) {
          entry.pins.push(real);
        }
      } else if (node.endsWith(":t+") || node.endsWith(":b+")) {
        entry.bbPower = true;
      } else if (node.endsWith(":t-") || node.endsWith(":b-")) {
        entry.bbGround = true;
      }
    }
  }

  const nets: SchematicNet[] = [];
  const netByPin = new Map<string, string>();
  for (const root of order) {
    const entry = groups.get(root);
    if (!entry) continue;
    const kind = netKind(entry.pins, entry.bbGround, entry.bbPower);
    if (entry.pins.length < 2 && kind === "signal") continue;
    if (entry.pins.length === 0) continue;
    const id = `net-${nets.length + 1}`;
    nets.push({
      id,
      kind,
      label: netLabel(kind, entry.pins),
      pins: entry.pins.map((entryPin) => ({ ...entryPin.ref })),
      connectionIds: [...new Set(entry.connectionIds)],
    });
    for (const entryPin of entry.pins) netByPin.set(pinKey(entryPin.ref.instanceId, entryPin.ref.pinId), id);
  }

  return {
    nets,
    netOfPin: (instanceId, pinId) => netByPin.get(pinKey(instanceId, pinId)),
    catalog,
    breadboards,
  };
}

export function buildNets(guide: Guide): SchematicNet[] {
  return buildNetModel(guide).nets;
}
