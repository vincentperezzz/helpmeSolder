import { describe, expect, it } from "vitest";
import {
  bestMatchName,
  countBySource,
  countByView,
  filterBySource,
  filterByView,
  lastSeenText,
  outcomeText,
  parseSearchStatus,
  parseSourceFilter,
  parseView,
  rawSearchesText,
  searchedText,
  searchesHref,
  searchTotals,
  sortSearches,
  validateAdminNote,
  type CatalogSearch,
} from "./searches";

function row(over: Partial<CatalogSearch>): CatalogSearch {
  return {
    key: "k",
    query: "battery",
    source: "search_catalog",
    demand: 1,
    searches: 1,
    no_match_searches: 0,
    last_result_count: 1,
    top_match_id: null,
    top_score: null,
    first_seen: "2026-01-01T00:00:00Z",
    last_seen: "2026-01-01T00:00:00Z",
    status: "new",
    admin_note: null,
    updated_at: null,
    ...over,
  };
}

const rows = [
  row({ key: "a", demand: 5, last_result_count: 0 }),
  row({ key: "b", demand: 9, status: "handled", last_result_count: 0 }),
  row({ key: "c", demand: 2, source: "ask_sensor", last_result_count: 3 }),
  row({ key: "d", demand: 2, status: "ignored", source: "ask_sensor" }),
];

describe("sortSearches", () => {
  it("puts new first, then demand, then last seen", () => {
    const sorted = sortSearches([
      row({ key: "h", status: "handled", demand: 9 }),
      row({ key: "old", demand: 2, last_seen: "2026-01-01T00:00:00Z" }),
      row({ key: "new", demand: 2, last_seen: "2026-02-01T00:00:00Z" }),
      row({ key: "big", demand: 7 }),
    ]);
    expect(sorted.map((r) => r.key)).toEqual(["big", "new", "old", "h"]);
  });
  it("does not change the input", () => {
    const input = [row({ key: "x", demand: 1 }), row({ key: "y", demand: 3 })];
    sortSearches(input);
    expect(input.map((r) => r.key)).toEqual(["x", "y"]);
  });
});

describe("filters and counts", () => {
  it("filters by view", () => {
    expect(filterByView(rows, "all")).toHaveLength(4);
    expect(filterByView(rows, "nomatch").map((r) => r.key)).toEqual(["a"]);
    expect(filterByView(rows, "found").map((r) => r.key)).toEqual(["c"]);
    expect(filterByView(rows, "handled").map((r) => r.key)).toEqual(["b"]);
    expect(filterByView(rows, "ignored").map((r) => r.key)).toEqual(["d"]);
  });
  it("filters by source", () => {
    expect(filterBySource(rows, "ask_sensor").map((r) => r.key)).toEqual(["c", "d"]);
    expect(filterBySource(rows, "all")).toHaveLength(4);
  });
  it("counts", () => {
    expect(countByView(rows)).toEqual({ all: 4, nomatch: 1, found: 1, handled: 1, ignored: 1 });
    expect(countBySource(rows)).toEqual({ all: 4, search_catalog: 2, ask_sensor: 2 });
  });
  it("totals", () => {
    expect(searchTotals(rows)).toEqual({ searches: 18, noMatch: 1, waiting: 2 });
  });
});

describe("parsing", () => {
  it("accepts known values only", () => {
    expect(parseView("nomatch")).toBe("nomatch");
    expect(parseView("zzz")).toBe("all");
    expect(parseSourceFilter("ask_sensor")).toBe("ask_sensor");
    expect(parseSourceFilter("x")).toBe("all");
    expect(parseSearchStatus("handled")).toBe("handled");
    expect(parseSearchStatus("shipped")).toBeNull();
    expect(parseSearchStatus(3)).toBeNull();
  });
  it("builds hrefs", () => {
    expect(searchesHref("all", "all")).toBe("/admin/searches");
    expect(searchesHref("nomatch", "ask_sensor", "x")).toBe(
      "/admin/searches?view=nomatch&source=ask_sensor&msg=x",
    );
  });
});

describe("wording", () => {
  it("pluralizes", () => {
    expect(searchedText(1)).toBe("1 person searched");
    expect(searchedText(3)).toBe("3 people searched");
    expect(rawSearchesText(3, 3)).toBe("");
    expect(rawSearchesText(1, 4)).toBe("4 searches in total");
  });
  it("describes outcomes", () => {
    expect(outcomeText(0)).toBe("No match");
    expect(outcomeText(4)).toBe("Found 4");
  });
  it("looks up the best match", () => {
    const lookup = (id: string) => (id === "x" ? "Battery" : undefined);
    expect(bestMatchName("x", lookup)).toBe("Battery");
    expect(bestMatchName("gone", lookup)).toBeNull();
    expect(bestMatchName(null, lookup)).toBeNull();
  });
  it("says when it was last seen", () => {
    const now = Date.parse("2026-01-10T00:00:00Z");
    expect(lastSeenText("2026-01-09T00:00:00Z", now)).toBe("Last seen yesterday");
    expect(lastSeenText("bad", now)).toBe("Last seen at an unknown time");
  });
});

describe("validateAdminNote", () => {
  it("accepts up to 200 characters and rejects more", () => {
    expect(validateAdminNote("a".repeat(200)).ok).toBe(true);
    expect(validateAdminNote("a".repeat(201)).ok).toBe(false);
    expect(validateAdminNote("  ")).toEqual({ ok: true, value: null });
  });
});
