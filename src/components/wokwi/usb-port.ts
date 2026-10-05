import type { ExitDir, Point, UsbConnectorKind } from "./types";

export type UsbSide = "top" | "bottom" | "left" | "right";

/**
 * Where a board's USB connector sits, in the board part's own coordinates.
 * `x`,`y` is the mouth of the connector on the board edge, where a plug
 * enters. Boards that are not listed have no USB connector we can point at.
 */
export type UsbPort = { kind: UsbConnectorKind; side: UsbSide; x: number; y: number };

/** Length of a drawn plug along the cable. */
export const PLUG_LENGTH = 22;

export const BOARD_USB_PORTS: Record<string, UsbPort> = {
  // Wokwi element coordinates (107 x 204 px board, USB at the bottom edge).
  "board.esp32.devkit": { kind: "micro-usb", side: "bottom", x: 53, y: 202 },
  // Wokwi Uno / Mega: USB-B jack sticks out of the left edge.
  "board.arduino.uno": { kind: "usb-b", side: "left", x: 0, y: 58 },
  "board.arduino.mega": { kind: "usb-b", side: "left", x: 0, y: 58 },
  "board.arduino.nano": { kind: "mini-usb", side: "left", x: 0, y: 34 },
  // Original SVG assets (coordinates read from each SVG).
  "board.pico.rp2040": { kind: "micro-usb", side: "top", x: 105, y: 8 },
  "board.pico.w": { kind: "micro-usb", side: "top", x: 100, y: 18 },
  "board.pico.2": { kind: "usb-c", side: "top", x: 100, y: 16 },
  "board.pi.zero.w": { kind: "micro-usb", side: "left", x: 8, y: 109 },
  "board.pi.3b.plus": { kind: "micro-usb", side: "bottom", x: 66, y: 252 },
  "board.pi.4b": { kind: "usb-c", side: "bottom", x: 57, y: 250 },
  "board.pi.5": { kind: "usb-c", side: "left", x: 10, y: 78 },
  "board.esp8266.nodemcu": { kind: "micro-usb", side: "top", x: 110, y: 8 },
};

export function getBoardUsbPort(catalogId: string): UsbPort | undefined {
  return BOARD_USB_PORTS[catalogId];
}

/** Direction pointing away from the board through its USB port. */
export function usbOutward(side: UsbSide): ExitDir {
  switch (side) {
    case "top":
      return { dx: 0, dy: -1 };
    case "bottom":
      return { dx: 0, dy: 1 };
    case "left":
      return { dx: -1, dy: 0 };
    default:
      return { dx: 1, dy: 0 };
  }
}

/** Cable end for a plug seated in a port whose mouth is `mouth`. */
export function plugBack(mouth: Point, outward: ExitDir): Point {
  return {
    x: mouth.x + outward.dx * PLUG_LENGTH,
    y: mouth.y + outward.dy * PLUG_LENGTH,
  };
}

export const PLUG_WIDTH: Record<UsbConnectorKind, number> = {
  "usb-a": 16,
  "usb-b": 15,
  "usb-c": 12,
  "micro-usb": 12,
  "mini-usb": 12,
};
