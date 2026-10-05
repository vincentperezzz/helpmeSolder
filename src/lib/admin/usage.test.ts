import { describe, expect, it } from "vitest";
import { guideUsageCounts } from "./usage";

const p = (catalogId: string, n: number) => ({ instanceId: `${catalogId}-${n}`, catalogId });

describe("guideUsageCounts", () => {
  it("counts guides, not part instances", () => {
    const counts = guideUsageCounts([[p("a", 1), p("a", 2), p("b", 1)], [p("a", 3)], null, []]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBeUndefined();
  });
});
