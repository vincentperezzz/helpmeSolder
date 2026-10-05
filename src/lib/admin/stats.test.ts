import { describe, expect, it } from "vitest";
import {
  averageOf,
  countBy,
  countCreatedWindows,
  retentionCounts,
  summarizeGuides,
  topPartCounts,
  type GuideRow,
} from "./stats";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-05T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("countCreatedWindows", () => {
  it("counts today (UTC), 7 and 30 day windows", () => {
    const result = countCreatedWindows(
      [ago(1000), ago(13 * 3600_000), ago(3 * DAY), ago(20 * DAY), ago(60 * DAY), "bad"],
      now,
    );
    expect(result).toEqual({ today: 1, last7: 3, last30: 4 });
  });
});

describe("countBy and topPartCounts", () => {
  it("sorts by count then key", () => {
    expect(countBy(["b", "a", "b", "c"], (x) => x)).toEqual([
      { key: "b", count: 2 },
      { key: "a", count: 1 },
      { key: "c", count: 1 },
    ]);
  });

  it("returns the top parts across guides", () => {
    const p = (catalogId: string) => ({ instanceId: catalogId, catalogId });
    const top = topPartCounts([[p("x"), p("y")], [p("x")], [p("z")]], 2);
    expect(top).toEqual([
      { key: "x", count: 2 },
      { key: "y", count: 1 },
    ]);
  });

  it("averages safely", () => {
    expect(averageOf([])).toBe(0);
    expect(averageOf([1, 2, 3])).toBe(2);
  });
});

describe("retentionCounts", () => {
  it("counts never reopened, idle 14+ days and expiring soon", () => {
    const rows = [
      { created_at: ago(40 * DAY), updated_at: ago(40 * DAY), last_accessed_at: ago(40 * DAY) },
      { created_at: ago(30 * DAY), updated_at: ago(25 * DAY), last_accessed_at: ago(25 * DAY) },
      { created_at: ago(5 * DAY), updated_at: ago(1 * DAY), last_accessed_at: ago(1 * DAY) },
    ];
    const result = retentionCounts(rows, now, 30);
    expect(result.idle14).toBe(2);
    expect(result.expiringSoon).toBe(1);
    expect(result.neverReopened).toBe(1);
  });
});

describe("summarizeGuides", () => {
  const rows: GuideRow[] = [
    {
      board_id: "board.arduino.uno",
      power_source: null,
      parts: [],
      connections: [],
      created_at: ago(1000),
      updated_at: ago(1000),
      last_accessed_at: ago(1000),
    },
    {
      board_id: null,
      power_source: "usb_wall",
      parts: [{ instanceId: "a", catalogId: "module.servo" }],
      connections: [],
      created_at: ago(2 * DAY),
      updated_at: ago(2 * DAY),
      last_accessed_at: ago(2 * DAY),
    },
  ];

  it("aggregates without a database", () => {
    const stats = summarizeGuides(rows, { now, retentionDays: 30, hasAccessColumn: true });
    expect(stats.total).toBe(2);
    expect(stats.byBoard.map((e) => e.key).sort()).toEqual(["board.arduino.uno", "not set"]);
    expect(stats.byPower.map((e) => e.key).sort()).toEqual(["not set", "usb_wall"]);
    expect(stats.validation.ok + stats.validation.warnings + stats.validation.blocked).toBe(2);
    expect(stats.avgParts).toBe(0.5);
    expect(stats.topParts[0]).toEqual({ key: "module.servo", count: 1 });
    expect(stats.retention).not.toBeNull();
  });

  it("omits retention without the column", () => {
    const stats = summarizeGuides(rows, { now, retentionDays: 30, hasAccessColumn: false });
    expect(stats.retention).toBeNull();
  });
});
