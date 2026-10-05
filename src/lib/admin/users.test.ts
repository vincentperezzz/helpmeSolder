import { describe, expect, it } from "vitest";
import { isMissingTable, summarizeUsers, type DailyCounts } from "./users";

const NOW = Date.UTC(2026, 5, 15, 0, 0, 1); // just after midnight UTC
const empty = (): DailyCounts => ({ visitor: {}, creator: {} });

describe("summarizeUsers", () => {
  it("returns zeros and no busiest day for empty data", () => {
    const s = summarizeUsers(empty(), NOW);
    expect(s.visitors).toEqual({ today: 0, yesterday: 0, last7: 0, last30: 0 });
    expect(s.creators).toEqual({ today: 0, yesterday: 0, last7: 0, last30: 0 });
    expect(s.series).toHaveLength(30);
    expect(s.series[29]).toEqual({ day: "2026-06-15", visitors: 0, creators: 0 });
    expect(s.series[0].day).toBe("2026-05-17");
  });

  it("uses UTC day boundaries for today and yesterday", () => {
    const d = empty();
    d.visitor["2026-06-15"] = 5;
    d.visitor["2026-06-14"] = 3;
    d.visitor["2026-06-16"] = 99; // future, ignored
    const s = summarizeUsers(d, Date.UTC(2026, 5, 15, 23, 59, 59));
    expect(s.visitors.today).toBe(5);
    expect(s.visitors.yesterday).toBe(3);
    const next = summarizeUsers(d, Date.UTC(2026, 5, 16, 0, 0, 0));
    expect(next.visitors.today).toBe(99);
    expect(next.visitors.yesterday).toBe(5);
  });

  it("sums whole-day windows of 7 and 30 days", () => {
    const d = empty();
    d.visitor["2026-06-15"] = 1; // day 0
    d.visitor["2026-06-09"] = 2; // day 6, in last7
    d.visitor["2026-06-08"] = 4; // day 7, only last30
    d.visitor["2026-05-17"] = 8; // day 29, in last30
    d.visitor["2026-05-16"] = 16; // day 30, outside
    d.creator["2026-06-15"] = 2;
    const s = summarizeUsers(d, NOW);
    expect(s.visitors.last7).toBe(3);
    expect(s.visitors.last30).toBe(15);
    expect(s.creators).toEqual({ today: 2, yesterday: 0, last7: 2, last30: 2 });
  });

  it("zero-fills a 30 day series for visitors and creators", () => {
    const d = empty();
    d.visitor["2026-06-10"] = 7;
    d.creator["2026-06-10"] = 2;
    d.creator["2026-06-12"] = 1;
    d.visitor["2026-05-17"] = 5; // day 29, first entry
    d.visitor["2026-05-16"] = 50; // day 30, outside
    const s = summarizeUsers(d, NOW);
    expect(s.series.find((x) => x.day === "2026-06-10")).toEqual({
      day: "2026-06-10",
      visitors: 7,
      creators: 2,
    });
    expect(s.series.find((x) => x.day === "2026-06-11")).toEqual({
      day: "2026-06-11",
      visitors: 0,
      creators: 0,
    });
    expect(s.series.find((x) => x.day === "2026-06-12")?.creators).toBe(1);
    expect(s.series[0]).toEqual({ day: "2026-05-17", visitors: 5, creators: 0 });
    expect(s.series.some((x) => x.day === "2026-05-16")).toBe(false);
  });
});

describe("isMissingTable", () => {
  it("recognises a missing daily_clients table", () => {
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "PGRST205" })).toBe(true);
    expect(isMissingTable({ message: 'relation "public.daily_clients" does not exist' })).toBe(true);
  });
  it("ignores other errors", () => {
    expect(isMissingTable({ code: "500", message: "boom" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});
