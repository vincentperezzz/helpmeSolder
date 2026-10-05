import { getCatalogPart } from "@/lib/catalog";
import {
  BATTERY_ELECTRICAL,
  POWER_BANK_ELECTRICAL,
  USB_WALL_ELECTRICAL,
  getBatteryRecord,
  isLithiumChemistry,
  isRechargeableLithium,
} from "@/lib/catalog/batteries";
import { POWER_SOURCE_VALUES } from "@/lib/guides/power-source";
import type {
  BatteryChemistry,
  CatalogPart,
  CatalogPin,
  Guide,
  GuideConnection,
  GuidePart,
  LogicLevel,
  PinElectrical,
  PowerSource,
  ValidationIssue,
  ValidationResult,
  ValidationSeverity,
  VoltageRange,
} from "@/lib/catalog/types";

function pinExists(part: GuidePart, pinId: string): boolean {
  const catalog = getCatalogPart(part.catalogId);
  return Boolean(catalog?.pins.some((pin) => pin.id === pinId));
}

function pinKinds(part: GuidePart, pinId: string) {
  const catalog = getCatalogPart(part.catalogId);
  return catalog?.pins.find((pin) => pin.id === pinId)?.kinds ?? [];
}

function alternativesForPin(part: GuidePart, wanted: string[]): string[] {
  const catalog = getCatalogPart(part.catalogId);
  if (!catalog) {
    return [];
  }
  return catalog.pins
    .filter((pin) => pin.kinds.some((kind) => wanted.includes(kind)))
    .map((pin) => `${catalog.id}:${pin.id}`)
    .slice(0, 6);
}

function isBreadboardRail(part: GuidePart | undefined, pinId: string): boolean {
  if (!part?.catalogId.includes("breadboard")) return false;
  return (
    pinId === "+" ||
    pinId === "-" ||
    pinId === "+.t" ||
    pinId === "-.t" ||
    pinId === "+.b" ||
    pinId === "-.b" ||
    /^[+-]\.[tb](\.\d+)?$/.test(pinId)
  );
}

export function validateGuide(guide: Guide): ValidationResult {
  const issues: ValidationIssue[] = [];
  const partsByInstance = new Map(guide.parts.map((part) => [part.instanceId, part]));

  if (!guide.power_source) {
    issues.push({
      code: "power_source_required",
      message:
        "Ask the user which power source (battery type or USB wall) before wiring. Call ask_power_source, then set_power_source.",
      alternatives: [...POWER_SOURCE_VALUES],
    });
  }

  for (const part of guide.parts) {
    if (!getCatalogPart(part.catalogId)) {
      issues.push({
        code: "unknown_part",
        message: `Unknown catalog part: ${part.catalogId}`,
        alternatives: [],
      });
    }
  }

  if (guide.board_id && !getCatalogPart(guide.board_id)) {
    issues.push({
      code: "unknown_board",
      message: `Unknown board: ${guide.board_id}`,
      alternatives: [],
    });
  }

  for (const connection of guide.connections) {
    validateConnection(connection, partsByInstance, issues);
  }

  const usedPins = new Map<string, string>();
  for (const connection of guide.connections) {
    for (const end of [connection.from, connection.to]) {
      const part = partsByInstance.get(end.instanceId);
      if (isBreadboardRail(part, end.pinId)) continue;
      const key = `${end.instanceId}:${end.pinId}`;
      const prior = usedPins.get(key);
      if (prior && prior !== connection.id) {
        issues.push({
          code: "pin_already_used",
          message: `Pin ${end.pinId} on ${end.instanceId} is used more than once.`,
          alternatives: part
            ? alternativesForPin(part, pinKinds(part, end.pinId))
            : [],
        });
      }
      usedPins.set(key, connection.id);
    }
  }

  issues.push(...validateElectrical(guide));

  const blocking = issues.filter(
    (issue) => issue.code !== "power_source_required" && issueSeverity(issue) === "error",
  );
  const needsPowerSource = issues.some((issue) => issue.code === "power_source_required");

  return {
    ok: blocking.length === 0 && !needsPowerSource,
    issues,
    needsPowerSource,
  };
}

function validateConnection(
  connection: GuideConnection,
  partsByInstance: Map<string, GuidePart>,
  issues: ValidationIssue[],
) {
  const fromPart = partsByInstance.get(connection.from.instanceId);
  const toPart = partsByInstance.get(connection.to.instanceId);

  if (!fromPart || !toPart) {
    issues.push({
      code: "unknown_instance",
      message: `Connection ${connection.id} references a missing part instance.`,
      alternatives: [],
    });
    return;
  }

  if (!pinExists(fromPart, connection.from.pinId)) {
    issues.push({
      code: "unknown_pin",
      message: `Unknown pin ${connection.from.pinId} on ${fromPart.catalogId}.`,
      alternatives: alternativesForPin(fromPart, ["digital", "analog", "i2c", "power", "ground"]),
    });
  }

  if (!pinExists(toPart, connection.to.pinId)) {
    issues.push({
      code: "unknown_pin",
      message: `Unknown pin ${connection.to.pinId} on ${toPart.catalogId}.`,
      alternatives: alternativesForPin(toPart, ["digital", "analog", "i2c", "power", "ground"]),
    });
  }

  const fromKinds = pinKinds(fromPart, connection.from.pinId);
  const toKinds = pinKinds(toPart, connection.to.pinId);

  if (fromKinds.includes("power") && toKinds.includes("ground")) {
    issues.push({
      code: "power_to_ground",
      message: "Do not connect power directly to ground.",
      alternatives: [],
    });
  }

  if (fromKinds.includes("ground") && toKinds.includes("power")) {
    issues.push({
      code: "power_to_ground",
      message: "Do not connect power directly to ground.",
      alternatives: [],
    });
  }

  const signalKinds = ["digital", "analog", "i2c", "spi", "uart"];
  const fromSignal = fromKinds.some((kind) => signalKinds.includes(kind));
  const toSignal = toKinds.some((kind) => signalKinds.includes(kind));
  const fromPowerish = fromKinds.includes("power") || fromKinds.includes("ground");
  const toPowerish = toKinds.includes("power") || toKinds.includes("ground");

  if (fromSignal && toSignal) {
    const overlap = fromKinds.filter((kind) => toKinds.includes(kind) && signalKinds.includes(kind));
    if (overlap.length === 0) {
      issues.push({
        code: "incompatible_pins",
        message: `Pins ${connection.from.pinId} and ${connection.to.pinId} are incompatible.`,
        alternatives: [
          ...alternativesForPin(fromPart, toKinds),
          ...alternativesForPin(toPart, fromKinds),
        ],
      });
    }
  }

  if (fromSignal && !toSignal && !toPowerish) {
    issues.push({
      code: "incompatible_pins",
      message: `Connection ${connection.id} has incompatible pin roles.`,
      alternatives: alternativesForPin(toPart, fromKinds),
    });
  }

  if (toSignal && !fromSignal && !fromPowerish) {
    issues.push({
      code: "incompatible_pins",
      message: `Connection ${connection.id} has incompatible pin roles.`,
      alternatives: alternativesForPin(fromPart, toKinds),
    });
  }
}

// ---------------------------------------------------------------------------
// Electrical safety (logic level, supply voltage, battery chemistry/polarity)
// ---------------------------------------------------------------------------

export const LOGIC_VOLTS: Record<LogicLevel, number> = { "3v3": 3.3, "5v": 5 };
/** Absolute-max input of 3.3V-only MCUs (VDD + 0.3V). */
export const MCU_3V3_MAX_INPUT = 3.6;
const EPS = 1e-9;
const SIGNAL_KINDS = ["digital", "analog", "i2c", "spi", "uart"];

/** Plain-words note on how a cell chemistry's voltage behaves, added to supply-range messages. */
function cellNote(chemistry: BatteryChemistry | undefined, nominal: number): string {
  if (isRechargeableLithium(chemistry)) {
    return " Li-ion/LiPo swings 3.0-4.2V per cell (3.7V nominal).";
  }
  if (chemistry === "nimh") {
    return ` NiMH cells are only 1.2V each, so this pack is ${nominal}V, lower than the same number of 1.5V alkaline cells.`;
  }
  if (chemistry === "coin-lithium") return " A coin cell is 3V nominal, 2.0V empty.";
  return "";
}

export function issueSeverity(issue: ValidationIssue): ValidationSeverity {
  return issue.severity ?? "error";
}

export type NetPin = {
  part: GuidePart;
  catalog: CatalogPart;
  pin: CatalogPin;
};

export type Net = { pins: NetPin[] };

function nodeKey(part: GuidePart, pinId: string): string {
  if (part.catalogId.includes("breadboard")) {
    const rail = /^([+-])(?:\.([tb]))?(?:\.\d+)?$/.exec(pinId);
    if (rail) return `${part.instanceId}|rail:${rail[1]}${rail[2] ?? "t"}`;
    const hole = /^([a-j])(\d+)$/.exec(pinId);
    if (hole) {
      return `${part.instanceId}|col:${hole[2]}:${"abcde".includes(hole[1]) ? "u" : "l"}`;
    }
  }
  return `${part.instanceId}|${pinId}`;
}

/**
 * Group connected pins into electrical nets. Breadboards are transparent:
 * holes join per column half, rails join per rail. Breadboard pins are not
 * included in `Net.pins`.
 */
export function buildNets(guide: Guide): Net[] {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    parent.set(key, root);
    return root;
  };
  const members = new Map<string, NetPin>();
  const partsByInstance = new Map(guide.parts.map((part) => [part.instanceId, part]));

  const register = (end: GuideConnection["from"]): string | null => {
    const part = partsByInstance.get(end.instanceId);
    if (!part) return null;
    const catalog = getCatalogPart(part.catalogId);
    const key = nodeKey(part, end.pinId);
    if (!parent.has(key)) parent.set(key, key);
    const pin = catalog?.pins.find((candidate) => candidate.id === end.pinId);
    if (catalog && pin && !catalog.id.includes("breadboard")) {
      members.set(key, { part, catalog, pin });
    }
    return key;
  };

  for (const connection of guide.connections) {
    const a = register(connection.from);
    const b = register(connection.to);
    if (a && b) parent.set(find(a), find(b));
  }

  const nets = new Map<string, Net>();
  for (const [key, member] of members) {
    const root = find(key);
    const net = nets.get(root) ?? { pins: [] };
    net.pins.push(member);
    nets.set(root, net);
  }
  return [...nets.values()];
}

export function resolvePinElectrical(
  catalog: CatalogPart,
  pin: CatalogPin,
): PinElectrical | undefined {
  const spec = catalog.electrical;
  if (!spec) return undefined;
  const explicit = spec.pins?.[pin.id];
  if (explicit) return explicit;
  if (spec.supply && pin.kinds.includes("power")) return { accepts: spec.supply };
  return undefined;
}

function sourceOf(item: NetPin) {
  return resolvePinElectrical(item.catalog, item.pin)?.source;
}

function sinkRange(electrical: PinElectrical | undefined): VoltageRange | undefined {
  if (!electrical) return undefined;
  if (electrical.accepts) return electrical.accepts;
  if (electrical.source && !electrical.source.external) return electrical.source;
  return undefined;
}

function isSignalPin(pin: CatalogPin): boolean {
  return pin.kinds.some((kind) => SIGNAL_KINDS.includes(kind));
}

function describe(item: NetPin): string {
  return `${item.part.label ?? item.catalog.name} ${item.pin.label}`;
}

function pinRef(item: NetPin): string {
  return `${item.part.instanceId}:${item.pin.id}`;
}

/** Sources that actually power the net: real supply parts win over board regulator outputs. */
export function activeSources(net: Net): NetPin[] {
  const all = net.pins.filter((item) => sourceOf(item));
  const external = all.filter((item) => sourceOf(item)?.external);
  return external.length > 0 ? external : all;
}

function supplyAlternatives(
  guide: Guide,
  fits: (nominal: number) => boolean,
  skip: NetPin[],
): string[] {
  const skipKeys = new Set(skip.map(pinRef));
  const out: string[] = [];
  for (const part of guide.parts) {
    const catalog = getCatalogPart(part.catalogId);
    if (!catalog?.electrical?.pins) continue;
    for (const pin of catalog.pins) {
      const source = resolvePinElectrical(catalog, pin)?.source;
      if (!source || skipKeys.has(`${part.instanceId}:${pin.id}`)) continue;
      if (fits(source.nominal)) out.push(`${catalog.id}:${pin.id}`);
    }
  }
  return [...new Set(out)].slice(0, 6);
}

function groundAlternatives(guide: Guide, exceptInstance: string): string[] {
  const out: string[] = [];
  for (const part of guide.parts) {
    if (part.instanceId === exceptInstance) continue;
    const catalog = getCatalogPart(part.catalogId);
    if (!catalog || catalog.id.includes("breadboard")) continue;
    for (const pin of catalog.pins) {
      if (pin.kinds.includes("ground")) out.push(`${catalog.id}:${pin.id}`);
    }
  }
  return [...new Set(out)].slice(0, 6);
}

export type SupplyVerdict = "ok" | "marginal" | "over" | "under";

/** Compare a supply (nominal + swing) against what a pin accepts. */
export function compareSupply(
  source: VoltageRange & { nominal: number },
  accepts: VoltageRange,
): SupplyVerdict {
  if (source.nominal > accepts.max + EPS) return "over";
  if (source.nominal < accepts.min - EPS) return "under";
  if (source.max > accepts.max + EPS || source.min < accepts.min - EPS) return "marginal";
  return "ok";
}

function fmt(range: VoltageRange): string {
  return `${range.min}-${range.max}V`;
}

/** Supply and power-pin limit rules (error: out of range, warning: marginal swing). */
export function checkSupplyRanges(guide: Guide, nets: Net[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const net of nets) {
    const sources = activeSources(net);
    if (sources.length === 0) continue;

    const externalNominals = new Set(
      sources.filter((item) => sourceOf(item)?.external).map((item) => sourceOf(item)?.nominal),
    );
    if (externalNominals.size > 1) {
      issues.push({
        code: "supply_sources_conflict",
        severity: "error",
        message: `Supplies of different voltage (${sources.map(describe).join(", ")}) are wired to the same net. Use one supply per rail.`,
        alternatives: [],
      });
    }

    for (const sink of net.pins) {
      const limit = sinkRange(resolvePinElectrical(sink.catalog, sink.pin));
      if (!limit) continue;
      for (const src of sources) {
        const source = sourceOf(src);
        if (!source || src === sink) continue;
        const sinkIsRegulatedOut = Boolean(sourceOf(sink)) && !sourceOf(sink)?.external;
        const pair = [pinRef(src), pinRef(sink)];
        if (sinkIsRegulatedOut && !source.external) pair.sort();
        const key = pair.join(">");
        if (seen.has(key)) continue;
        seen.add(key);

        const verdict = compareSupply(source, limit);
        if (verdict === "ok") continue;
        const chemistry = src.catalog.electrical?.battery?.chemistry;
        const cell = cellNote(chemistry, source.nominal);
        const fits = (nominal: number) =>
          nominal >= limit.min - EPS && nominal <= limit.max + EPS;
        const alternatives = supplyAlternatives(guide, fits, [src, sink]);
        const base = `${describe(src)} supplies ${source.nominal}V (${fmt(source)}) but ${describe(sink)} accepts ${fmt(limit)}.${cell}`;

        if (sinkIsRegulatedOut && !source.external) {
          issues.push({
            code: "power_rails_shorted",
            severity: "error",
            message: `${describe(src)} (${source.nominal}V) and ${describe(sink)} are different rails but are wired together.`,
            alternatives: [],
          });
        } else if (verdict === "over") {
          issues.push({
            code: "supply_over_voltage",
            severity: "error",
            message: `${base} This would damage it - use a regulator/buck converter or a lower rail.`,
            alternatives,
          });
        } else if (verdict === "under") {
          issues.push({
            code: "supply_under_voltage",
            severity: "error",
            message: `${base} It will not run reliably - use a boost converter or a higher rail.`,
            alternatives,
          });
        } else {
          issues.push({
            code: "supply_voltage_marginal",
            severity: "warning",
            message: `${base} Nominal is fine but the supply can swing outside the range (fresh/low battery or sag).`,
            alternatives,
          });
        }
      }
    }
  }
  return issues;
}

/** Voltage a module is actually powered at in this guide's wiring, if known. */
export function resolveSupplyVolts(part: GuidePart, nets: Net[]): number | undefined {
  let best: number | undefined;
  for (const net of nets) {
    const powered = net.pins.some(
      (item) =>
        item.part.instanceId === part.instanceId &&
        item.pin.kinds.includes("power") &&
        resolvePinElectrical(item.catalog, item.pin)?.accepts,
    );
    if (!powered) continue;
    for (const src of activeSources(net)) {
      const nominal = sourceOf(src)?.nominal;
      if (nominal !== undefined && (best === undefined || nominal > best)) best = nominal;
    }
  }
  return best;
}

function outputVolts(item: NetPin, nets: Net[]): number | undefined {
  const spec = item.catalog.electrical;
  if (!spec?.logic) return undefined;
  if (item.catalog.kind === "board") return LOGIC_VOLTS[spec.logic];
  if (spec.inputOnlyPins?.includes(item.pin.id)) return undefined;
  if (spec.logicFollowsSupply) {
    return resolveSupplyVolts(item.part, nets) ?? LOGIC_VOLTS[spec.logic];
  }
  return LOGIC_VOLTS[spec.logic];
}

type Driver = { item: NetPin; volts: number; isSupply: boolean };

/** 5V-into-3.3V and marginal-HIGH logic level rules. */
export function checkLogicLevels(guide: Guide, nets: Net[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const net of nets) {
    const drivers: Driver[] = [];
    for (const item of net.pins) {
      const src = sourceOf(item);
      if (src) {
        drivers.push({ item, volts: src.nominal, isSupply: true });
      } else if (isSignalPin(item.pin)) {
        const volts = outputVolts(item, nets);
        if (volts !== undefined) drivers.push({ item, volts, isSupply: false });
      }
    }

    for (const rx of net.pins) {
      if (!isSignalPin(rx.pin)) continue;
      const spec = rx.catalog.electrical;
      if (!spec) continue;
      const isBoard = rx.catalog.kind === "board";
      const tolerance = isBoard
        ? spec.fiveVTolerantIo === false
          ? MCU_3V3_MAX_INPUT
          : undefined
        : spec.inputMaxVolts;
      const hard = isBoard || spec.inputMaxIsHard !== false;
      const rxSupply = isBoard ? undefined : resolveSupplyVolts(rx.part, nets);

      for (const drv of drivers) {
        if (drv.item.part.instanceId === rx.part.instanceId) continue;
        const key = `${pinRef(drv.item)}>${pinRef(rx)}`;
        if (seen.has(key)) continue;

        if (tolerance !== undefined && drv.volts > tolerance + EPS) {
          seen.add(key);
          const driverSupply = drv.item.catalog.electrical?.supply;
          const fits = (nominal: number) =>
            nominal <= tolerance + EPS &&
            (!driverSupply ||
              (nominal >= driverSupply.min - EPS && nominal <= driverSupply.max + EPS));
          const code = drv.isSupply
            ? "gpio_on_supply_rail"
            : isBoard
              ? "logic_level_5v_into_3v3_gpio"
              : "logic_level_overvoltage_input";
          const what = drv.isSupply
            ? `${describe(drv.item)} (${drv.volts}V supply rail) is wired straight to signal pin ${describe(rx)}`
            : `${describe(drv.item)} drives ${drv.volts}V into ${describe(rx)}`;
          const fix = drv.isSupply
            ? ""
            : ", or power the sensor from 3.3V if its supply range allows";
          issues.push({
            code,
            severity: hard ? "error" : "warning",
            message: `${what}, which tolerates at most ${tolerance}V. Use a level shifter (or a voltage divider for one-way signals)${fix}.`,
            alternatives: drv.isSupply ? [] : supplyAlternatives(guide, fits, [drv.item]),
          });
          continue;
        }

        if (!drv.isSupply && !isBoard) {
          const supplyV = rxSupply ?? (spec.logic ? LOGIC_VOLTS[spec.logic] : undefined);
          const thresholds: number[] = [];
          if (spec.inputHighFraction !== undefined && supplyV !== undefined) {
            thresholds.push(spec.inputHighFraction * supplyV);
          }
          if (spec.inputHighVolts !== undefined) thresholds.push(spec.inputHighVolts);
          const threshold = thresholds.length ? Math.max(...thresholds) : undefined;
          if (threshold !== undefined && drv.volts < threshold - EPS) {
            seen.add(key);
            issues.push({
              code: "logic_level_marginal",
              severity: "warning",
              message: `${describe(drv.item)} drives ${drv.volts}V but ${describe(rx)} needs about ${threshold.toFixed(2)}V to read HIGH. It may be unreliable - add a level shifter or power it from a lower rail.`,
              alternatives: [],
            });
          }
        }
      }
    }
  }
  return issues;
}

/** Supply parts (battery/USB) wired backwards or shorted. */
export function checkSupplyPolarity(guide: Guide, nets: Net[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const net of nets) {
    for (const item of net.pins) {
      if (sourceOf(item)?.external) {
        const grounds = net.pins.filter(
          (other) => other.part !== item.part && other.pin.kinds.includes("ground"),
        );
        if (grounds.length > 0) {
          const fire = isLithiumChemistry(item.catalog.electrical?.battery?.chemistry);
          issues.push({
            code: "reverse_polarity",
            severity: "error",
            message: `${describe(item)} (positive) is wired to ground (${grounds.map(describe).join(", ")}). This shorts the supply${
              fire ? " - a shorted lithium cell or LiPo pack can overheat and ignite" : ""
            }. Check + and - are not swapped.`,
            alternatives: groundAlternatives(guide, item.part.instanceId),
          });
        }
      } else if (
        item.pin.kinds.includes("ground") &&
        item.catalog.id.startsWith("passive.power.")
      ) {
        const hot = net.pins.filter((other) => other.part !== item.part && sourceOf(other));
        if (hot.length > 0) {
          issues.push({
            code: "reverse_polarity",
            severity: "error",
            message: `${describe(item)} (negative) is wired to a supply pin (${hot.map(describe).join(", ")}). Polarity is reversed or the rails are shorted.`,
            alternatives: groundAlternatives(guide, item.part.instanceId),
          });
        }
      }
    }
  }
  return issues;
}

function powerSourceSpec(source: PowerSource) {
  if (source === "usb_wall") return USB_WALL_ELECTRICAL;
  if (source === "power_bank") return POWER_BANK_ELECTRICAL;
  return BATTERY_ELECTRICAL[source];
}

/**
 * When the guide only declares a power source (no explicit battery/USB part),
 * warn if the board has no power pin that accepts that source's voltage.
 */
export function checkPowerSourceVsBoard(guide: Guide): ValidationIssue[] {
  if (!guide.power_source || !guide.board_id) return [];
  if (guide.parts.some((part) => part.catalogId.startsWith("passive.power."))) return [];
  const board = getCatalogPart(guide.board_id);
  if (!board?.electrical?.pins) return [];
  const accepts = (source: PowerSource) => {
    const spec = powerSourceSpec(source);
    return board.pins.some((pin) => {
      const limit = sinkRange(resolvePinElectrical(board, pin));
      if (!limit) return false;
      const verdict = compareSupply(spec, limit);
      return verdict === "ok" || verdict === "marginal";
    });
  };
  if (accepts(guide.power_source)) return [];
  const spec = powerSourceSpec(guide.power_source);
  return [
    {
      code: "power_source_needs_regulation",
      severity: "warning",
      message: `${guide.power_source} is ${spec.nominal}V nominal, which no power pin on ${board.name} accepts directly. Add a regulator (buck) or boost converter between the supply and the board.`,
      alternatives: POWER_SOURCE_VALUES.filter((candidate) => accepts(candidate)).slice(0, 8),
    },
  ];
}

/**
 * A source that can only supply a few milliamps (a coin cell) is allowed, but the
 * build must be low-power. One warning per guide, whether the cell is a wired part
 * or only the declared power source.
 */
export function checkSupplyCurrent(guide: Guide): ValidationIssue[] {
  const limited = guide.parts.find(
    (part) => getCatalogPart(part.catalogId)?.electrical?.battery?.lowCurrent,
  );
  const declared =
    guide.power_source && guide.power_source !== "usb_wall" && guide.power_source !== "power_bank"
      ? getBatteryRecord(guide.power_source)
      : undefined;
  if (!limited && !declared?.lowCurrent) return [];
  const name = limited
    ? (limited.label ?? getCatalogPart(limited.catalogId)?.name ?? "The coin cell")
    : (declared?.label ?? "The coin cell");
  return [
    {
      code: "supply_current_limited",
      severity: "warning",
      message: `${name} can only supply a few milliamps. It is fine for a sleeping microcontroller, an LED or a sensor reading, but Wi-Fi/Bluetooth bursts, motors, servos, buzzers and LED strips will make the board reset. Add a 100-470 µF capacitor across the supply and ground, or use a bigger source.`,
      alternatives: [],
    },
  ];
}

/** All electrical-safety rules. Pure: depends only on the guide and the catalog. */
export function validateElectrical(guide: Guide): ValidationIssue[] {
  const nets = buildNets(guide);
  return [
    ...checkSupplyRanges(guide, nets),
    ...checkLogicLevels(guide, nets),
    ...checkSupplyPolarity(guide, nets),
    ...checkPowerSourceVsBoard(guide),
    ...checkSupplyCurrent(guide),
  ];
}
