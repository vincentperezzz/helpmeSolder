import { describe, expect, it } from "vitest";
import {
  chartSummary,
  formatDayLabel,
  hasAnyActivity,
  niceAxis,
  pickBusiest,
  tooltipText,
  xLabelIndexes,
  type DailyPoint,
} from "./chart";

const pt = (day: string, visitors: number, creators = 0): DailyPoint => ({ day, visitors, creators });

describe("niceAxis", () => {
  it("gives a flat 0 to 4 axis for no data", () => {
    expect(niceAxis(0)).toEqual({ max: 4, ticks: [0, 2, 4] });
    expect(niceAxis(Number.NaN).max).toBe(4);
  });
  it("keeps small counts readable", () => {
    expect(niceAxis(1)).toEqual({ max: 2, ticks: [0, 1, 2] });
    expect(niceAxis(3)).toEqual({ max: 3, ticks: [0, 1, 2, 3] });
  });
  it("rounds up to a nice step", () => {
    expect(niceAxis(5)).toEqual({ max: 6, ticks: [0, 2, 4, 6] });
    expect(niceAxis(12)).toEqual({ max: 15, ticks: [0, 5, 10, 15] });
    expect(niceAxis(87)).toEqual({ max: 100, ticks: [0, 50, 100] });
    expect(niceAxis(1234).max).toBe(1500);
  });
  it("always covers the data with 3 to 5 ticks", () => {
    for (let m = 0; m <= 2000; m++) {
      const a = niceAxis(m);
      expect(a.max).toBeGreaterThanOrEqual(m);
      expect(a.ticks.length).toBeGreaterThanOrEqual(3);
      expect(a.ticks.length).toBeLessThanOrEqual(5);
    }
  });
});

describe("formatDayLabel", () => {
  it("uses short plain UTC dates", () => {
    expect(formatDayLabel("2026-10-05")).toBe("Oct 5");
    expect(formatDayLabel("2026-01-31")).toBe("Jan 31");
  });
  it("returns bad input unchanged", () => {
    expect(formatDayLabel("nope")).toBe("nope");
    expect(formatDayLabel("2026-13-01")).toBe("2026-13-01");
  });
});

describe("tooltipText", () => {
  it("names both counts", () => {
    expect(tooltipText(pt("2026-10-04", 12, 2))).toBe("Oct 4: 12 visitors, 2 creators");
    expect(tooltipText(pt("2026-10-04", 1, 1))).toBe("Oct 4: 1 visitor, 1 creator");
    expect(tooltipText(pt("2026-10-04", 0, 0))).toBe("Oct 4: 0 visitors, 0 creators");
  });
});

describe("pickBusiest", () => {
  it("returns null with no visitors", () => {
    expect(pickBusiest([])).toBeNull();
    expect(pickBusiest([pt("2026-10-01", 0, 4)])).toBeNull();
  });
  it("prefers the most recent day on a tie", () => {
    const s = [pt("2026-10-01", 9), pt("2026-10-02", 3), pt("2026-10-03", 9)];
    expect(pickBusiest(s)?.day).toBe("2026-10-03");
  });
});

describe("xLabelIndexes", () => {
  it("labels first day, every 7th day and today for 30 days", () => {
    expect(xLabelIndexes(30)).toEqual([0, 8, 15, 22, 29]);
  });
  it("moves the oldest label to the first day when it would crowd it", () => {
    expect(xLabelIndexes(24)).toEqual([0, 9, 16, 23]);
  });
  it("handles tiny and empty series", () => {
    expect(xLabelIndexes(0)).toEqual([]);
    expect(xLabelIndexes(1)).toEqual([0]);
  });
});

describe("chartSummary and hasAnyActivity", () => {
  it("summarises total and busiest day", () => {
    const s = [pt("2026-10-03", 4), pt("2026-10-04", 12)];
    expect(chartSummary(s)).toContain("16 visitors in total");
    expect(chartSummary(s)).toContain("Busiest day Oct 4 with 12 visitors");
    expect(hasAnyActivity(s)).toBe(true);
  });
  it("says so when empty", () => {
    const s = [pt("2026-10-03", 0)];
    expect(chartSummary(s)).toContain("No visits recorded");
    expect(hasAnyActivity(s)).toBe(false);
  });
});
