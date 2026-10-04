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
      VBUS: { x: 192, y: 70 },
      "3V3": { x: 192, y: 154 },
      GND: { x: 192, y: 112 },
      GP0: { x: 18, y: 70 },
      GP1: { x: 18, y: 91 },
    },
  },
  "board.pico.w": {
    src: "/assets/boards/pico-w.svg",
    width: 200,
    height: 420,
    caption: "Raspberry Pi Pico W",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      VBUS: { x: 160, y: 70 },
      "3V3": { x: 160, y: 130 },
      GND: { x: 160, y: 100 },
      GP0: { x: 40, y: 70 },
      GP1: { x: 40, y: 85 },
    },
  },
  "board.pico.2": {
    src: "/assets/boards/pico-2.svg",
    width: 200,
    height: 420,
    caption: "Raspberry Pi Pico 2 (RP2350)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      VBUS: { x: 160, y: 70 },
      "3V3": { x: 160, y: 130 },
      GND: { x: 160, y: 100 },
      GP0: { x: 40, y: 70 },
      GP1: { x: 40, y: 85 },
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
};

export const optionalBoardAssets: Record<string, BoardAsset> = {
  "board.pico.r3.fritzing": {
    src: "/assets/boards/pico-r3-fritzing-breadboard.svg",
    width: 210,
    height: 520,
    caption: "Raspberry Pi Pico R3 (official Fritzing)",
    license: "Raspberry Pi open design grant",
  },
  "board.pico.w.fritzing": {
    src: "/assets/boards/pico-w-fritzing-breadboard.svg",
    width: 210,
    height: 520,
    caption: "Raspberry Pi Pico W (official Fritzing)",
    license: "Raspberry Pi open design grant",
  },
  "board.pi.zero.pinviz": {
    src: "/assets/boards/pi-zero-pinviz.svg",
    width: 291,
    height: 582,
    caption: "Raspberry Pi Zero (PinViz)",
    license: "MIT - nordstad/PinViz",
  },
};

export function getBoardAsset(id: string): BoardAsset | undefined {
  return boardAssets[id] ?? optionalBoardAssets[id];
}
