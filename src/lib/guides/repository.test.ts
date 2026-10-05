import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: { op: string; args: unknown[] }[] = [];
let selectResult: { data: unknown; error: unknown };
let updateError: unknown;
let deleteResults: { data: unknown; error: unknown }[];

function chain(op: string, resolver: () => unknown) {
  const builder: Record<string, unknown> = {};
  const handler = (name: string) => (...args: unknown[]) => {
    calls.push({ op: `${op}.${name}`, args });
    return builder;
  };
  for (const name of ["eq", "or", "lt", "select", "single", "maybeSingle"]) {
    builder[name] = handler(name);
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(resolver()).then(resolve, reject);
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        calls.push({ op: "select", args });
        return chain("select", () => selectResult);
      },
      update: (...args: unknown[]) => {
        calls.push({ op: "update", args });
        return chain("update", () => ({ data: null, error: updateError }));
      },
      delete: () => {
        calls.push({ op: "delete", args: [] });
        return chain("delete", () => deleteResults.shift());
      },
    }),
  }),
}));

import { deleteExpiredGuides, getGuide } from "./repository";

const DAY = 24 * 60 * 60 * 1000;
const row = (last: string | null | undefined) => ({
  id: "g1",
  title: "",
  power_source: null,
  board_id: null,
  parts: [],
  connections: [],
  steps: [],
  notes: [],
  created_at: "",
  updated_at: "",
  ...(last === undefined ? {} : { last_accessed_at: last }),
});
const updates = () => calls.filter((c) => c.op === "update");

beforeEach(() => {
  calls.length = 0;
  updateError = null;
  deleteResults = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("getGuide touch", () => {
  it("touches when last_accessed_at is older than 24h", async () => {
    selectResult = { data: row(new Date(Date.now() - 2 * DAY).toISOString()), error: null };
    await getGuide("g1");
    expect(updates()).toHaveLength(1);
    expect(updates()[0].args[0]).toHaveProperty("last_accessed_at");
  });

  it("does not touch when fresh", async () => {
    selectResult = { data: row(new Date(Date.now() - 1000).toISOString()), error: null };
    await getGuide("g1");
    expect(updates()).toHaveLength(0);
  });

  it("does not touch when the column is absent (migration not applied)", async () => {
    selectResult = { data: row(undefined), error: null };
    const guide = await getGuide("g1");
    expect(guide?.id).toBe("g1");
    expect(updates()).toHaveLength(0);
  });

  it("never throws when the touch fails", async () => {
    selectResult = { data: row(new Date(Date.now() - 2 * DAY).toISOString()), error: null };
    updateError = { code: "XX000", message: "boom" };
    await expect(getGuide("g1")).resolves.toMatchObject({ id: "g1" });
    expect(console.error).toHaveBeenCalled();
  });

  it("returns null for a missing guide", async () => {
    selectResult = { data: null, error: null };
    expect(await getGuide("nope")).toBeNull();
  });
});

describe("deleteExpiredGuides", () => {
  it("uses a cutoff of now minus retention days and returns the count", async () => {
    deleteResults = [{ data: [{ id: "a" }, { id: "b" }], error: null }];
    const before = Date.now();
    const n = await deleteExpiredGuides(30);
    expect(n).toBe(2);
    const or = calls.find((c) => c.op === "delete.or");
    const filter = or?.args[0] as string;
    const cutoff = Date.parse(filter.match(/last_accessed_at\.lt\.([^,]+),/)![1]);
    expect(cutoff).toBeGreaterThanOrEqual(before - 30 * DAY - 5);
    expect(cutoff).toBeLessThanOrEqual(Date.now() - 30 * DAY + 5);
    expect(filter).toContain("last_accessed_at.is.null");
    expect(filter).toContain("updated_at.lt.");
  });

  it("refuses to delete anything when the column is missing", async () => {
    deleteResults = [
      { data: null, error: { code: "42703", message: "column last_accessed_at does not exist" } },
    ];
    await expect(deleteExpiredGuides(30)).rejects.toThrow(/Nothing was deleted/);
    expect(calls.some((c) => c.op === "delete.lt")).toBe(false);
  });

  it("throws on other errors", async () => {
    deleteResults = [{ data: null, error: new Error("db down") }];
    await expect(deleteExpiredGuides(30)).rejects.toThrow("db down");
  });
});
