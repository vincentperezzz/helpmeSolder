import { getCatalogPart } from "@/lib/catalog";
import type { Guide } from "@/lib/catalog/types";
import { wokwiAttrs } from "@/lib/catalog/wokwi";
import { breadboardCol, isBreadboardId, parseBreadboardRail } from "./breadboard";
import { BB_HEIGHT, BB_ORIGIN_X, BB_ROW_Y, BB_STEP } from "./constants";
import type { PlacedPart } from "./types";

export function seatPassiveOnBreadboard(
  part: PlacedPart,
  breadboard: PlacedPart,
  guide: Guide,
): boolean {
  const holePins = guide.connections.flatMap((connection) => {
    const ends = [connection.from, connection.to];
    const onBoard = ends.find((end) => end.instanceId === breadboard.instanceId);
    const onPart = ends.find((end) => end.instanceId === part.instanceId);
    if (!onBoard || !onPart) return [];
    return [onBoard.pinId];
  });
  if (holePins.length === 0) return false;

  const cols = holePins
    .map((pinId) => breadboardCol(pinId))
    .filter((col): col is number => col != null);
  const isLed = part.catalogId.includes(".led.");
  const isResistor = part.catalogId.includes("resistor");
  const usesTopRail = holePins.some((pinId) => {
    const rail = parseBreadboardRail(pinId);
    return rail?.side === "t";
  });
  const usesBotRail = holePins.some((pinId) => {
    const rail = parseBreadboardRail(pinId);
    return rail?.side === "b";
  });

  if (cols.length === 0) {
    part.x = breadboard.x + 48;
    part.y = breadboard.y + (isLed ? 42 : 70);
    part.seated = true;
    return true;
  }

  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const midCol = (minCol + maxCol) / 2;
  const midX = BB_ORIGIN_X + (midCol - 1) * BB_STEP;

  if (isResistor) {
    part.x = breadboard.x + midX - 28;
    part.y = breadboard.y + BB_ROW_Y.e - 8;
  } else if (isLed) {
    const colX = BB_ORIGIN_X + (maxCol - 1) * BB_STEP;
    part.x = breadboard.x + colX - 10;
    if (usesTopRail && !usesBotRail) {
      part.y = breadboard.y + BB_ROW_Y.a - 6;
    } else if (usesBotRail && !usesTopRail) {
      part.y = breadboard.y + BB_ROW_Y.j - 20;
    } else {
      part.y = breadboard.y + BB_ROW_Y.a - 4;
    }
  } else {
    part.x = breadboard.x + midX - 16;
    part.y = breadboard.y + BB_ROW_Y.c - 4;
  }
  part.seated = true;
  return true;
}

export function layoutParts(guide: Guide): PlacedPart[] {
  const boards: PlacedPart[] = [];
  const passives: PlacedPart[] = [];
  const modules: PlacedPart[] = [];

  for (const part of guide.parts) {
    const catalog = getCatalogPart(part.catalogId);
    if (!catalog) continue;
    const placed: PlacedPart = {
      instanceId: part.instanceId,
      catalogId: part.catalogId,
      tag: catalog.wokwi?.tag,
      attrs: wokwiAttrs(catalog),
      x: 0,
      y: 0,
      name: part.label || catalog.name,
      kind: catalog.kind,
    };
    if (catalog.kind === "board") boards.push(placed);
    else if (catalog.kind === "passive") passives.push(placed);
    else modules.push(placed);
  }

  let boardY = 120;
  boards.forEach((part, index) => {
    part.x = 120;
    part.y = boardY;
    boardY += index === 0 ? 380 : 280;
  });

  const breadboards = passives.filter((part) => isBreadboardId(part.catalogId));
  const otherPassives = passives.filter((part) => !isBreadboardId(part.catalogId));

  let breadboardY = 120;
  breadboards.forEach((part) => {
    part.x = 620;
    part.y = breadboardY;
    breadboardY += BB_HEIGHT + 56;
  });

  const primaryBreadboard = breadboards[0];
  let freepassiveY = breadboardY;
  otherPassives.forEach((part) => {
    if (primaryBreadboard && seatPassiveOnBreadboard(part, primaryBreadboard, guide)) {
      return;
    }
    part.x = primaryBreadboard ? 1040 : 620;
    part.y = freepassiveY;
    freepassiveY += 120;
  });

  let moduleY = 120;
  modules.forEach((part) => {
    const tall =
      part.tag?.includes("lcd") ||
      part.tag?.includes("ili9341") ||
      part.tag?.includes("ssd1306");
    part.x = passives.length > 0 ? 1080 : 700;
    part.y = moduleY;
    moduleY += tall ? 300 : 200;
  });

  return [...boards, ...breadboards, ...otherPassives, ...modules];
}

export function boardPowerPins(board: PlacedPart): { vin?: string; gnd?: string; usb?: string } {
  const catalog = getCatalogPart(board.catalogId);
  if (!catalog) return {};
  const ids = catalog.pins.map((pin) => pin.id);
  const vin =
    ids.find((id) => id.toUpperCase() === "VIN") ||
    ids.find((id) => id.toLowerCase() === "vin") ||
    ids.find((id) => id.toLowerCase() === "vbus") ||
    ids.find((id) => id === "5V");
  const gnd =
    ids.find((id) => id.startsWith("GND")) ||
    ids.find((id) => id.toLowerCase() === "gnd");
  const usb =
    ids.find((id) => id.toUpperCase() === "USB") ||
    ids.find((id) => id.toLowerCase() === "vbus") ||
    vin;
  return { vin, gnd, usb };
}
