import { describe, expect, it } from "vitest";
import { layoutParts } from "@/components/wokwi/layout";
import { prefersDiagramAsset } from "@/lib/catalog/board-assets";
import { hasWokwiVisual } from "@/lib/catalog/wokwi";
import { getCatalogPart } from "@/lib/catalog";
import { hasBreadboard, isPlugConnection, buildSolderItems } from "@/lib/guides/solder-plan";
import { validateGuide } from "@/lib/guides/validator";
import { EXAMPLE_GUIDE, EXAMPLE_PART_ORDER } from "./example-guide";

describe("homepage example guide", () => {
  it("is the production ESP32 Button Buzzer breadboard build", () => {
    expect(EXAMPLE_GUIDE.title).toBe("ESP32 Button Buzzer");
    expect(EXAMPLE_GUIDE.power_source).toBe("battery_3aa");
    expect(EXAMPLE_GUIDE.board_id).toBe("board.esp32.devkit");
    expect(EXAMPLE_GUIDE.parts.find((part) => part.catalogId === "board.esp32.devkit")?.label).toBe(
      "ESP32 DevKit V1",
    );
    expect(EXAMPLE_GUIDE.parts.find((part) => part.catalogId === "board.esp32.devkit")?.instanceId).toBe(
      "board1",
    );
    expect(hasBreadboard(EXAMPLE_GUIDE)).toBe(true);
    expect(EXAMPLE_GUIDE.connections.some(isPlugConnection)).toBe(true);
    expect(EXAMPLE_GUIDE.steps.map((step) => step.order)).toEqual([1, 2, 3, 4, 5]);
    expect(validateGuide(EXAMPLE_GUIDE).ok).toBe(true);
    expect(() => layoutParts(EXAMPLE_GUIDE)).not.toThrow();
    expect(buildSolderItems(EXAMPLE_GUIDE)).toHaveLength(6);
    for (const id of EXAMPLE_PART_ORDER) {
      expect(EXAMPLE_GUIDE.parts.some((part) => part.instanceId === id)).toBe(true);
    }
  });

  it("draws the live Wokwi ESP32 DevKit, same as the production guide", () => {
    const catalog = getCatalogPart("board.esp32.devkit");
    expect(catalog?.wokwi?.tag).toBe("wokwi-esp32-devkit-v1");
    expect(prefersDiagramAsset("board.esp32.devkit", Boolean(hasWokwiVisual(catalog)))).toBe(false);
    const placed = layoutParts(EXAMPLE_GUIDE).find((part) => part.catalogId === "board.esp32.devkit");
    expect(placed?.tag).toBe("wokwi-esp32-devkit-v1");
  });
});
