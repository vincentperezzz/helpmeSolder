import { describe, expect, it } from "vitest";
import {
  filterByStatus,
  isMissingRequestsTable,
  parseStatus,
  parseStatusFilter,
  pinSummary,
  relativeTime,
  sortRequests,
  summarizeRequests,
  summaryText,
  validateAdminNote,
  validateAliasTarget,
  validateRequestKey,
  type PartRequest,
} from "./requests";

const now = Date.parse("2026-10-05T12:00:00Z");
const row = (key: string, extra: Partial<PartRequest> = {}): PartRequest => ({
  key,
  display_name: key,
  kind: "module",
  source: null,
  demand: 1,
  calls: 1,
  first_seen: "2026-10-01T00:00:00Z",
  last_seen: "2026-10-02T00:00:00Z",
  example_pins: null,
  note: null,
  suggested_catalog_id: null,
  status: "new",
  mapped_catalog_id: null,
  admin_note: null,
  updated_at: null,
  ...extra,
});

describe("sort, filter and summary", () => {
  const rows = [
    row("a", { demand: 2, last_seen: "2026-10-01T00:00:00Z" }),
    row("b", { demand: 5, status: "planned" }),
    row("c", { demand: 2, last_seen: "2026-10-04T00:00:00Z", status: "building" }),
    row("d", { demand: 1, status: "shipped" }),
  ];
  it("sorts by demand then last seen without mutating", () => {
    const copy = [...rows];
    expect(sortRequests(rows).map((r) => r.key)).toEqual(["b", "c", "a", "d"]);
    expect(rows).toEqual(copy);
  });
  it("filters by status", () => {
    expect(filterByStatus(rows, "all")).toHaveLength(4);
    expect(filterByStatus(rows, "planned").map((r) => r.key)).toEqual(["b"]);
  });
  it("parses the status query", () => {
    expect(parseStatusFilter("building")).toBe("building");
    expect(parseStatusFilter("nope")).toBe("all");
    expect(parseStatusFilter(undefined)).toBe("all");
    expect(parseStatus("all")).toBeNull();
  });
  it("summarizes", () => {
    const s = summarizeRequests(rows);
    expect(s).toEqual({ total: 4, notStarted: 1, inProgress: 2 });
    expect(summaryText(s)).toBe("4 parts requested, 1 not started, 2 in progress");
    expect(summaryText({ total: 1, notStarted: 1, inProgress: 0 })).toContain("1 part requested");
  });
});

describe("relativeTime", () => {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  it("uses plain words", () => {
    expect(relativeTime(ago(10_000), now)).toBe("just now");
    expect(relativeTime(ago(5 * 60_000), now)).toBe("5 minutes ago");
    expect(relativeTime(ago(3_600_000), now)).toBe("1 hour ago");
    expect(relativeTime(ago(30 * 3_600_000), now)).toBe("yesterday");
    expect(relativeTime(ago(3 * 86_400_000), now)).toBe("3 days ago");
    expect(relativeTime(ago(21 * 86_400_000), now)).toBe("3 weeks ago");
    expect(relativeTime(ago(90 * 86_400_000), now)).toBe("3 months ago");
    expect(relativeTime(ago(-5000), now)).toBe("just now");
    expect(relativeTime("bad", now)).toBe("unknown");
    expect(relativeTime(null, now)).toBe("unknown");
  });
});

describe("pinSummary", () => {
  it("lists labels, falling back to ids", () => {
    expect(pinSummary([{ label: "VCC" }, { id: "gnd" }, {}])).toBe("VCC, gnd");
    expect(pinSummary(null)).toBe("");
    expect(pinSummary([{ label: "a" }, { label: "b" }, { label: "c" }], 2)).toBe("a, b and 1 more");
  });
});

describe("input validation", () => {
  it("checks notes", () => {
    expect(validateAdminNote("  hi  ")).toEqual({ ok: true, value: "hi" });
    expect(validateAdminNote("   ")).toEqual({ ok: true, value: null });
    expect(validateAdminNote("x".repeat(200)).ok).toBe(true);
    expect(validateAdminNote("x".repeat(201)).ok).toBe(false);
    expect(validateAdminNote(5).ok).toBe(false);
    expect(validateAdminNote("a\u0000b")).toEqual({ ok: true, value: "ab" });
  });
  it("checks alias targets against the catalog", () => {
    const exists = (id: string) => id === "module.servo";
    expect(validateAliasTarget(" module.servo ", exists)).toEqual({ ok: true, id: "module.servo" });
    expect(validateAliasTarget("module.nope", exists).ok).toBe(false);
    expect(validateAliasTarget(null, exists).ok).toBe(false);
  });
  it("checks keys", () => {
    expect(validateRequestKey(" abc ")).toBe("abc");
    expect(validateRequestKey("")).toBeNull();
    expect(validateRequestKey("x".repeat(201))).toBeNull();
  });
});

describe("isMissingRequestsTable", () => {
  it("detects a missing table", () => {
    expect(isMissingRequestsTable({ code: "42P01" })).toBe(true);
    expect(isMissingRequestsTable({ code: "PGRST205" })).toBe(true);
    expect(
      isMissingRequestsTable({ message: 'relation "public.part_requests" does not exist' }),
    ).toBe(true);
    expect(isMissingRequestsTable({ code: "500", message: "boom" })).toBe(false);
    expect(isMissingRequestsTable(null)).toBe(false);
  });
});
