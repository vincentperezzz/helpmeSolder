import { describe, expect, it } from "vitest";
import { layoutParts } from "@/components/wokwi/layout";
import { hasBreadboard, isPlugConnection } from "@/lib/guides/solder-plan";
import { validateGuide } from "@/lib/guides/validator";
import { EXAMPLE_GUIDE, EXAMPLE_PART_ORDER } from "./example-guide";

describe("homepage example guide", () => {
  it("is a real breadboard build the diagram can draw", () => {
    expect(EXAMPLE_GUIDE.title).toBe("ESP32 Button Buzzer");
    expect(EXAMPLE_GUIDE.power_source).toBe("battery_3aa");
    expect(hasBreadboard(EXAMPLE_GUIDE)).toBe(true);
    expect(EXAMPLE_GUIDE.connections.some(isPlugConnection)).toBe(true);
    expect(EXAMPLE_GUIDE.steps.map((step) => step.order)).toEqual([1, 2, 3, 4, 5]);
    expect(validateGuide(EXAMPLE_GUIDE).ok).toBe(true);
    expect(() => layoutParts(EXAMPLE_GUIDE)).not.toThrow();
    for (const id of EXAMPLE_PART_ORDER) {
      expect(EXAMPLE_GUIDE.parts.some((part) => part.instanceId === id)).toBe(true);
    }
  });
});
