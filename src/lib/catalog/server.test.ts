import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFakeSupabase } from "@/test/fake-supabase";
import { fetchCatalogRows } from "./db/rows";
import { getActiveCatalog } from "./registry";
import type { RawRows } from "./registry";
import { SEED_SNAPSHOT } from "./seed";
import {
  catalogHealth,
  configureCatalogSource,
  ensureCatalog,
  invalidateLocalCatalog,
} from "./server";

const seedModule = SEED_SNAPSHOT.modules[0];
const NEW_ID = "module.test-widget";

function adminPartRow(version = 1, id = NEW_ID) {
  return {
    id,
    kind: "module" as const,
    published: { part: { ...seedModule, id, name: `Widget v${version}` } },
    seed_base: null,
    origin: "admin" as const,
    lifecycle: "active" as const,
    replaced_by: null,
    version,
  };
}

function rowsWith(parts: RawRows["parts"] = [], mode: "db" | "seed" = "db"): RawRows {
  return { parts, recipes: [], media: [], settings: { mode } };
}

function makeLoader(initial: RawRows) {
  let rows = initial;
  const loader = vi.fn(async () => rows);
  return {
    loader,
    set(next: RawRows) {
      rows = next;
    },
  };
}

const has = (id: string) => getActiveCatalog().parts.has(id);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => {
  configureCatalogSource(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ensureCatalog", () => {
  it("does nothing when the source is the seed", async () => {
    const { loader } = makeLoader(rowsWith([adminPartRow()]));
    configureCatalogSource("seed");
    await ensureCatalog();
    await ensureCatalog({ force: true });
    expect(loader).not.toHaveBeenCalled();
    expect(has(NEW_ID)).toBe(false);
  });

  it("defaults to the seed under vitest", async () => {
    configureCatalogSource(null);
    await ensureCatalog();
    expect(catalogHealth().source).toBe("seed");
  });

  it("loads once, then the warm path does not load or wait", async () => {
    const { loader } = makeLoader(rowsWith([adminPartRow()]));
    configureCatalogSource({ loader });
    await ensureCatalog();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(has(NEW_ID)).toBe(true);

    let resolved = false;
    void ensureCatalog().then(() => (resolved = true));
    await Promise.resolve();
    expect(resolved).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-checks at most every 15 seconds", async () => {
    const { loader, set } = makeLoader(rowsWith([adminPartRow(1)]));
    configureCatalogSource({ loader });
    await ensureCatalog();

    set(rowsWith([adminPartRow(2)]));
    await vi.advanceTimersByTimeAsync(14_000);
    await ensureCatalog();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v1");

    await vi.advanceTimersByTimeAsync(1_500);
    await ensureCatalog();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v2");
  });

  it("deduplicates concurrent refreshes", async () => {
    const { loader } = makeLoader(rowsWith([adminPartRow()]));
    configureCatalogSource({ loader });
    await Promise.all([ensureCatalog(), ensureCatalog(), ensureCatalog()]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("cold start waits at most 800 ms, serves the seed, then completes", async () => {
    const loader = vi.fn(
      () => new Promise<RawRows>((resolve) => setTimeout(() => resolve(rowsWith([adminPartRow()])), 2_000)),
    );
    configureCatalogSource({ loader });

    let resolved = false;
    void ensureCatalog().then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(799);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(resolved).toBe(true);
    expect(has(NEW_ID)).toBe(false);
    expect(getActiveCatalog()).toBe(SEED_SNAPSHOT);

    await vi.advanceTimersByTimeAsync(1_300);
    expect(has(NEW_ID)).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("a stale refresh waits at most 300 ms and keeps the old snapshot meanwhile", async () => {
    let delay = 0;
    let rows = rowsWith([adminPartRow(1)]);
    const loader = vi.fn(
      () => new Promise<RawRows>((resolve) => setTimeout(() => resolve(rows), delay)),
    );
    configureCatalogSource({ loader });
    await Promise.all([ensureCatalog(), vi.advanceTimersByTimeAsync(0)]);

    await vi.advanceTimersByTimeAsync(20_000);
    delay = 1_000;
    rows = rowsWith([adminPartRow(2)]);
    let resolved = false;
    void ensureCatalog().then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(301);
    expect(resolved).toBe(true);
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v1");
    await vi.advanceTimersByTimeAsync(800);
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v2");
  });

  it("keeps the last good snapshot on failure and backs off for 30 seconds", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { loader } = makeLoader(rowsWith([adminPartRow()]));
    configureCatalogSource({ loader });
    await ensureCatalog();
    expect(has(NEW_ID)).toBe(true);

    loader.mockRejectedValue(new Error("db down"));
    await vi.advanceTimersByTimeAsync(16_000);
    await expect(ensureCatalog()).resolves.toBeUndefined();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(has(NEW_ID)).toBe(true);
    expect(catalogHealth().lastError).toBe("db down");
    expect(errors).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(29_000);
    await ensureCatalog();
    expect(loader).toHaveBeenCalledTimes(2);

    loader.mockResolvedValue(rowsWith([adminPartRow(2)]));
    await vi.advanceTimersByTimeAsync(2_000);
    await ensureCatalog();
    expect(loader).toHaveBeenCalledTimes(3);
    expect(catalogHealth().lastError).toBeNull();
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v2");
  });

  it("serves the seed when the very first load fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    configureCatalogSource({ loader: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(ensureCatalog()).resolves.toBeUndefined();
    expect(getActiveCatalog()).toBe(SEED_SNAPSHOT);
  });

  it("mode 'seed' in the database is a kill switch", async () => {
    const { loader, set } = makeLoader(rowsWith([adminPartRow()]));
    configureCatalogSource({ loader });
    await ensureCatalog();
    expect(has(NEW_ID)).toBe(true);

    set(rowsWith([adminPartRow()], "seed"));
    await vi.advanceTimersByTimeAsync(16_000);
    await ensureCatalog();
    expect(getActiveCatalog()).toBe(SEED_SNAPSHOT);
    expect(has(NEW_ID)).toBe(false);
  });

  it("force refresh bypasses the throttle and the failure backoff", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { loader, set } = makeLoader(rowsWith([adminPartRow(1)]));
    configureCatalogSource({ loader });
    await ensureCatalog();

    set(rowsWith([adminPartRow(2)]));
    await ensureCatalog();
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v1");
    await ensureCatalog({ force: true });
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v2");

    loader.mockRejectedValueOnce(new Error("blip"));
    invalidateLocalCatalog();
    await ensureCatalog();
    set(rowsWith([adminPartRow(3)]));
    await ensureCatalog({ force: true });
    expect(getActiveCatalog().parts.get(NEW_ID)?.name).toBe("Widget v3");
  });

  it("reports problems in health and logs each bad row version once", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = { ...adminPartRow(1, "module.bad-one"), kind: "board" as const };
    const { loader } = makeLoader(rowsWith([bad, adminPartRow()]));
    configureCatalogSource({ loader });
    await ensureCatalog();

    expect(has(NEW_ID)).toBe(true);
    expect(has("module.bad-one")).toBe(false);
    expect(catalogHealth().problems.map((p) => p.id)).toEqual(["module.bad-one"]);
    expect(errors).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(16_000);
    await ensureCatalog();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(errors).toHaveBeenCalledTimes(1);
  });
});

describe("fetchCatalogRows", () => {
  const tables = () => ({
    catalog_parts: [
      { ...adminPartRow(), draft: { part: { secret: true } }, created_at: "2026-01-01" },
      {
        id: "module.only-draft",
        kind: "module",
        published: null,
        draft: { part: {} },
        seed_base: null,
        origin: "admin",
        lifecycle: "active",
        replaced_by: null,
        version: 1,
        created_at: "2026-01-02",
      },
      {
        id: "module.retired",
        kind: "module",
        published: null,
        draft: null,
        seed_base: { id: "module.retired" },
        origin: "seed",
        lifecycle: "deprecated",
        replaced_by: null,
        version: 3,
        created_at: "2026-01-03",
      },
    ],
    catalog_recipes: [],
    catalog_media: [{ photo_hint: "a b", url: "/x.png", license: "CC0" }],
    catalog_settings: [{ id: 1, mode: "db", version: 7 }],
  });

  it("never selects draft data and skips draft-only rows", async () => {
    const db = createFakeSupabase(tables());
    const rows = await fetchCatalogRows(db as unknown as SupabaseClient);

    for (const call of db.calls) expect(call.columns).not.toMatch(/draft|license|\*/);
    expect(db.calls.find((c) => c.table === "catalog_parts")?.columns).toBe(
      "id, kind, published, seed_base, origin, lifecycle, replaced_by, version",
    );
    expect(rows.parts.map((p) => p.id)).toEqual([NEW_ID, "module.retired"]);
    for (const p of rows.parts) expect(p).not.toHaveProperty("draft");
    expect(rows.media).toEqual([{ photo_hint: "a b", url: "/x.png" }]);
    expect(rows.settings.mode).toBe("db");
  });

  it("defaults to db mode without a settings row and reads seed mode", async () => {
    const t = tables();
    t.catalog_settings = [];
    expect((await fetchCatalogRows(createFakeSupabase(t) as unknown as SupabaseClient)).settings.mode).toBe("db");
    t.catalog_settings = [{ id: 1, mode: "seed", version: 8 }];
    expect((await fetchCatalogRows(createFakeSupabase(t) as unknown as SupabaseClient)).settings.mode).toBe("seed");
  });

  it("throws on a Supabase error", async () => {
    const db = createFakeSupabase(tables());
    db.failWith("permission denied", "catalog_media");
    await expect(fetchCatalogRows(db as unknown as SupabaseClient)).rejects.toThrow(/catalog_media: permission denied/);
  });
});
