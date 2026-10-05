import { describe, expect, it } from "vitest";
import { getCatalogPart } from "@/lib/catalog";
import { BOARD_USB_PORTS, PLUG_LENGTH, plugBack, usbOutward } from "./usb-port";

describe("usb ports", () => {
  it("only lists boards that exist in the catalog", () => {
    for (const id of Object.keys(BOARD_USB_PORTS)) {
      expect(getCatalogPart(id)?.kind, id).toBe("board");
    }
  });

  it("places the plug back outside the board edge, on the cable side", () => {
    const mouth = { x: 53, y: 202 };
    expect(plugBack(mouth, usbOutward("bottom"))).toEqual({ x: 53, y: 202 + PLUG_LENGTH });
    expect(plugBack({ x: 100, y: 16 }, usbOutward("top"))).toEqual({ x: 100, y: 16 - PLUG_LENGTH });
    expect(plugBack({ x: 0, y: 58 }, usbOutward("left")).x).toBe(-PLUG_LENGTH);
  });
});
