import { describe, expect, it } from "vitest";
import type { Guide } from "@/lib/catalog/types";
import { previewPowerFeedback } from "@/lib/guides/power-preview";

const base = {
  id: "g1",
  parts: [],
  connections: [],
  steps: [],
  notes: [],
} as unknown as Guide;

describe("previewPowerFeedback", () => {
  it("returns nothing when no power is chosen", () => {
    const guide = { ...base, power_source: null } as Guide;
    expect(previewPowerFeedback(guide, guide)).toEqual({ damage: [], headsUp: [] });
  });

  it("returns nothing when the preview equals the default", () => {
    const guide = { ...base, power_source: "usb_wall" } as Guide;
    expect(previewPowerFeedback(guide, guide)).toEqual({ damage: [], headsUp: [] });
  });
});
