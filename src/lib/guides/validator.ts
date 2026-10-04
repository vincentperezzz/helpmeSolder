import { getCatalogPart } from "@/lib/catalog";
import type {
  Guide,
  GuideConnection,
  GuidePart,
  ValidationIssue,
  ValidationResult,
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
  return pinId === "+" || pinId === "-";
}

export function validateGuide(guide: Guide): ValidationResult {
  const issues: ValidationIssue[] = [];
  const partsByInstance = new Map(guide.parts.map((part) => [part.instanceId, part]));

  if (!guide.power_source) {
    issues.push({
      code: "power_source_required",
      message:
        "Ask the user whether power is a battery pack or a USB wall adapter before wiring. Call ask_power_source, then set_power_source.",
      alternatives: ["battery", "usb_wall"],
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

  const blocking = issues.filter((issue) => issue.code !== "power_source_required");
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
