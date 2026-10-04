import {
  getModuleAsset,
  moduleAssets,
  type ModuleAsset,
} from "./module-assets";

export type BoardTerminalPoint = { x: number; y: number };

export type BoardAsset = {
  src: string;
  width: number;
  height: number;
  caption: string;
  license: string;
  /** SVG user units matching the file viewBox; keys are catalog pin ids. */
  terminals?: Record<string, BoardTerminalPoint>;
};

export type { ModuleAsset };
export { moduleAssets, getModuleAsset };

/**
 * Visual assets for wiring diagrams (BoardAssets pattern, like BatteryAssets).
 * Prefer CC0 simplified SVGs for wire math; MIT extracts for richer silhouettes.
 */
export const boardAssets: Record<string, BoardAsset> = {
  "board.esp32.devkit": {
    src: "/assets/boards/esp32-devkit-v1.svg",
    width: 110,
    height: 260,
    caption: "ESP32 DevKit V1 (simplified)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3v3": { x: 202, y: 100 },
      gnd: { x: 202, y: 125.4 },
      vin: { x: 18, y: 455.6 },
      gpio2: { x: 202, y: 176.2 },
      gpio4: { x: 202, y: 201.6 },
      gpio5: { x: 202, y: 277.8 },
      gpio15: { x: 202, y: 150.8 },
      gpio16: { x: 202, y: 227 },
      gpio17: { x: 202, y: 252.4 },
      gpio18: { x: 202, y: 303.2 },
      gpio19: { x: 202, y: 328.6 },
      gpio21: { x: 202, y: 354 },
      gpio22: { x: 202, y: 430.2 },
      gpio23: { x: 202, y: 455.6 },
      gpio25: { x: 18, y: 277.8 },
      gpio26: { x: 18, y: 303.2 },
      gpio27: { x: 18, y: 328.6 },
      gpio32: { x: 18, y: 227 },
      gpio33: { x: 18, y: 252.4 },
      gpio34: { x: 18, y: 176.2 },
      gpio35: { x: 18, y: 201.6 },
    },
  },
  "board.esp8266.nodemcu": {
    src: "/assets/boards/esp8266-nodemcu-cc0.svg",
    width: 110,
    height: 260,
    caption: "ESP8266 NodeMCU (simplified)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3v3": { x: 202, y: 207 },
      gnd: { x: 202, y: 232.4 },
      vin: { x: 18, y: 435.6 },
      d0: { x: 202, y: 80 },
      d1: { x: 202, y: 105.4 },
      d2: { x: 202, y: 130.8 },
      d3: { x: 202, y: 156.2 },
      d4: { x: 202, y: 181.6 },
      d5: { x: 202, y: 257.8 },
      d6: { x: 202, y: 283.2 },
      d7: { x: 202, y: 308.6 },
      d8: { x: 202, y: 334 },
      a0: { x: 18, y: 80 },
    },
  },
};

/** Optional / future catalog ids (not in boards.ts yet). */
export const optionalBoardAssets: Record<string, BoardAsset> = {
  "board.esp32.s3.devkitc": {
    src: "/assets/boards/esp32-s3-devkitc.svg",
    width: 120,
    height: 280,
    caption: "ESP32-S3 DevKitC style (simplified)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3v3": { x: 18, y: 88 },
      gnd: { x: 18, y: 539.5 },
      "5v": { x: 18, y: 518 },
    },
  },
};

export function getBoardAsset(id: string): BoardAsset | undefined {
  return boardAssets[id] ?? optionalBoardAssets[id];
}

/** Convenience alias used by BoardAssets.tsx */
export function getPartDiagramAsset(id: string): BoardAsset | ModuleAsset | undefined {
  return getBoardAsset(id) ?? getModuleAsset(id);
}
