import { describe, expect, it } from "vitest";
import type { Guide } from "@/lib/catalog/types";
import { CREATOR_LINE } from "@/lib/site/creator";
import { teachingGaps } from "./tools";

function guide(overrides: Partial<Guide>): Guide {
  return {
    id: "g",
    title: "t",
    power_source: "usb_wall",
    board_id: null,
    parts: [],
    connections: [],
    steps: [],
    notes: [],
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("teachingGaps", () => {
  it("asks for reasons and a recap when none are given", () => {
    const gaps = teachingGaps(
      guide({
        connections: [
          { id: "c1", from: { instanceId: "a", pinId: "1" }, to: { instanceId: "b", pinId: "2" } },
        ],
        steps: [{ id: "s1", title: "Solder", body: "Do it", order: 1 }],
      }),
    );
    expect(gaps).toHaveLength(3);
    expect(gaps[0]).toContain("c1");
  });

  it("is quiet when every connection and step explains itself", () => {
    const gaps = teachingGaps(
      guide({
        connections: [
          {
            id: "c1",
            from: { instanceId: "a", pinId: "1" },
            to: { instanceId: "b", pinId: "2" },
            why: "Shares ground",
          },
        ],
        steps: [{ id: "s1", title: "Solder", body: "Do it", order: 1, why: "So it works", learned: "GND is shared" }],
      }),
    );
    expect(gaps).toEqual([]);
  });
});

describe("creator credit", () => {
  it("names GitHub and Instagram", () => {
    expect(CREATOR_LINE).toContain("github.com/vincentperezzz");
    expect(CREATOR_LINE).toContain("instagram.com/_vincentperez");
  });
});
