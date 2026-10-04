export type BoardTerminalPoint = { x: number; y: number };

export type BoardAsset = {
  src: string;
  width: number;
  height: number;
  caption: string;
  license: string;
  terminals?: Record<string, BoardTerminalPoint>;
};

export const boardAssets: Record<string, BoardAsset> = {
  "board.pico.rp2040": {
    src: "/assets/boards/pico-rp2040.svg",
    width: 210,
    height: 520,
    caption: "Raspberry Pi Pico (RP2040)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      vbus: { x: 168, y: 72 },
      "3v3": { x: 168, y: 136 },
      gnd: { x: 168, y: 104 },
      gp0: { x: 42, y: 72 },
      gp1: { x: 42, y: 88 },
      gp2: { x: 42, y: 104 },
      gp3: { x: 42, y: 120 },
      gp15: { x: 42, y: 312 },
      gp26: { x: 168, y: 280 },
      gp27: { x: 168, y: 296 },
      gp28: { x: 168, y: 312 },
    },
  },
  "board.pico.w": {
    src: "/assets/boards/pico-w.svg",
    width: 200,
    height: 420,
    caption: "Raspberry Pi Pico W (Wi-Fi + Bluetooth)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      vbus: { x: 160, y: 70 },
      "3v3": { x: 160, y: 130 },
      gnd: { x: 160, y: 100 },
      gp0: { x: 40, y: 70 },
      gp1: { x: 40, y: 85 },
      gp2: { x: 40, y: 100 },
      gp3: { x: 40, y: 115 },
      gp15: { x: 40, y: 280 },
      gp26: { x: 160, y: 250 },
      gp27: { x: 160, y: 265 },
      gp28: { x: 160, y: 280 },
    },
  },
  "board.pico.2": {
    src: "/assets/boards/pico-2.svg",
    width: 200,
    height: 420,
    caption: "Raspberry Pi Pico 2 (RP2350)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      vbus: { x: 160, y: 70 },
      "3v3": { x: 160, y: 130 },
      gnd: { x: 160, y: 100 },
      gp0: { x: 40, y: 70 },
      gp1: { x: 40, y: 85 },
      gp2: { x: 40, y: 100 },
      gp3: { x: 40, y: 115 },
      gp15: { x: 40, y: 280 },
      gp26: { x: 160, y: 250 },
      gp27: { x: 160, y: 265 },
      gp28: { x: 160, y: 280 },
    },
  },
  "board.pi.zero.w": {
    src: "/assets/boards/pi-zero-w.svg",
    width: 320,
    height: 180,
    caption: "Raspberry Pi Zero W",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3V3": { x: 56, y: 22 },
      "5V": { x: 56, y: 36 },
      GND: { x: 80, y: 36 },
    },
  },
  "board.pi.3b.plus": {
    src: "/assets/boards/pi-3b-plus.svg",
    width: 400,
    height: 280,
    caption: "Raspberry Pi 3 Model B+",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3V3": { x: 70, y: 50 },
      "5V": { x: 70, y: 62 },
      GND: { x: 118, y: 50 },
    },
  },
  "board.pi.4b": {
    src: "/assets/boards/pi-4b.svg",
    width: 400,
    height: 280,
    caption: "Raspberry Pi 4 Model B",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3V3": { x: 70, y: 50 },
      "5V": { x: 70, y: 62 },
      GND: { x: 118, y: 50 },
    },
  },
  "board.pi.5": {
    src: "/assets/boards/pi-5.svg",
    width: 400,
    height: 280,
    caption: "Raspberry Pi 5",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3V3": { x: 70, y: 50 },
      "5V": { x: 70, y: 62 },
      GND: { x: 118, y: 50 },
    },
  },
  "board.esp8266.nodemcu": {
    src: "/assets/boards/esp8266-nodemcu-cc0.svg",
    width: 220,
    height: 520,
    caption: "ESP8266 NodeMCU",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      "3v3": { x: 190, y: 100 },
      gnd: { x: 190, y: 130 },
      vin: { x: 30, y: 450 },
      d0: { x: 190, y: 160 },
      d1: { x: 190, y: 190 },
      d2: { x: 190, y: 220 },
      d3: { x: 190, y: 250 },
      d4: { x: 190, y: 280 },
      d5: { x: 190, y: 310 },
      d6: { x: 190, y: 340 },
      d7: { x: 190, y: 370 },
      d8: { x: 190, y: 400 },
      a0: { x: 30, y: 100 },
    },
  },
  "board.esp32.devkit": {
    src: "/assets/boards/esp32-devkit-v1.svg",
    width: 220,
    height: 520,
    caption: "ESP32 DevKit V1",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      VIN: { x: 30, y: 80 },
      "3V3": { x: 30, y: 110 },
      "GND.1": { x: 30, y: 140 },
      "GND.2": { x: 190, y: 140 },
      D5: { x: 190, y: 280 },
      D18: { x: 190, y: 310 },
      D19: { x: 190, y: 340 },
      D21: { x: 190, y: 370 },
      D22: { x: 190, y: 400 },
      D23: { x: 190, y: 430 },
    },
  },
};

export const moduleAssets: Record<string, BoardAsset> = {
  "module.soil.moisture": {
    src: "/assets/modules/soil-moisture-capacitive.svg",
    width: 160,
    height: 420,
    caption: "Capacitive soil moisture sensor",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      VCC: { x: 48, y: 42 },
      GND: { x: 72, y: 42 },
      AO: { x: 96, y: 42 },
      DO: { x: 120, y: 42 },
      vcc: { x: 48, y: 42 },
      gnd: { x: 72, y: 42 },
      ao: { x: 96, y: 42 },
      do: { x: 120, y: 42 },
    },
  },
};

export function getBoardAsset(id: string): BoardAsset | undefined {
  return boardAssets[id];
}

export function getModuleAsset(id: string): BoardAsset | undefined {
  return moduleAssets[id];
}

export function getDiagramAsset(id: string): BoardAsset | undefined {
  return getBoardAsset(id) ?? getModuleAsset(id);
}

export function prefersDiagramAsset(catalogId: string, hasWokwi: boolean): boolean {
  if (getModuleAsset(catalogId)) return true;
  if (!getBoardAsset(catalogId)) return false;
  if (/pico|\.pi\.|nodemcu|esp8266/i.test(catalogId)) return true;
  return !hasWokwi;
}
