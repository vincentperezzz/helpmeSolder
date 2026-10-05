import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/guides/repository", () => ({
  createGuide: vi.fn(),
  getGuide: vi.fn(),
  updateGuide: vi.fn(),
}));

vi.mock("@/lib/analytics/clients", () => ({ recordClientLater: vi.fn() }));

import { recordClientLater } from "@/lib/analytics/clients";
import * as repo from "@/lib/guides/repository";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { POST as createRoute } from "./guides/route";
import { GET as getRoute, PATCH as patchRoute } from "./guides/[id]/route";
import { POST as validateRoute } from "./guides/[id]/validate/route";

const mocked = vi.mocked(repo);

const fakeGuide = {
  id: "abc",
  title: "t",
  power_source: null,
  board_id: null,
  parts: [],
  connections: [],
  steps: [],
  notes: [],
  created_at: "",
  updated_at: "",
};

const ctx = { params: Promise.resolve({ id: "abc" }) };
const mk = (method: string, body?: string, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/guides", { method, body, headers });

beforeEach(() => {
  resetRateLimits();
  vi.stubEnv("MCP_API_KEY", "");
  vi.stubEnv("ALLOW_PUBLIC_API", "");
  vi.stubEnv("NODE_ENV", "development");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("POST /api/guides", () => {
  it("201 with empty body", async () => {
    mocked.createGuide.mockResolvedValue(fakeGuide);
    const res = await createRoute(mk("POST"));
    expect(res.status).toBe(201);
    expect((await res.json()).guide.id).toBe("abc");
  });

  it("400 on bad body and malformed JSON", async () => {
    const bad = await createRoute(mk("POST", JSON.stringify({ title: 5 })));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("Invalid request body");
    const malformed = await createRoute(mk("POST", "{x"));
    expect(malformed.status).toBe(400);
  });

  it("records the creator only after a successful create", async () => {
    vi.mocked(recordClientLater).mockClear();
    mocked.createGuide.mockRejectedValue(new Error("x"));
    await createRoute(mk("POST", "{}"));
    expect(recordClientLater).not.toHaveBeenCalled();
    mocked.createGuide.mockResolvedValue(fakeGuide);
    await createRoute(mk("POST", "{}"));
    expect(recordClientLater).toHaveBeenCalledWith("creator", expect.anything());
  });

  it("500 generic when repository throws", async () => {
    mocked.createGuide.mockRejectedValue(new Error("pg connection string leaked"));
    const res = await createRoute(mk("POST", "{}"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("401 without key when MCP_API_KEY set", async () => {
    vi.stubEnv("MCP_API_KEY", "secret");
    const res = await createRoute(mk("POST", "{}"));
    expect(res.status).toBe(401);
    expect(mocked.createGuide).not.toHaveBeenCalled();
    mocked.createGuide.mockResolvedValue(fakeGuide);
    const ok = await createRoute(mk("POST", "{}", { "x-api-key": "secret" }));
    expect(ok.status).toBe(201);
  });

  it("429 after create limit", async () => {
    vi.stubEnv("RATE_LIMIT_CREATE_PER_HOUR", "1");
    mocked.createGuide.mockResolvedValue(fakeGuide);
    expect((await createRoute(mk("POST", "{}"))).status).toBe(201);
    const res = await createRoute(mk("POST", "{}"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("GET/PATCH /api/guides/[id]", () => {
  it("GET 404 when missing", async () => {
    mocked.getGuide.mockResolvedValue(null);
    const res = await getRoute(mk("GET"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Guide not found" });
  });

  it("GET 500 generic when repository throws", async () => {
    mocked.getGuide.mockRejectedValue(new Error("boom"));
    const res = await getRoute(mk("GET"), ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("GET 401 without key", async () => {
    vi.stubEnv("MCP_API_KEY", "secret");
    expect((await getRoute(mk("GET"), ctx)).status).toBe(401);
  });

  it("PATCH 404 when missing", async () => {
    mocked.getGuide.mockResolvedValue(null);
    const res = await patchRoute(mk("PATCH", "{}"), ctx);
    expect(res.status).toBe(404);
  });

  it("PATCH 400 on bad body", async () => {
    mocked.getGuide.mockResolvedValue(fakeGuide);
    const res = await patchRoute(mk("PATCH", JSON.stringify({ parts: "no" })), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).issues.length).toBeGreaterThan(0);
  });

  it("PATCH 500 generic when update throws", async () => {
    mocked.getGuide.mockResolvedValue(fakeGuide);
    mocked.updateGuide.mockRejectedValue(new Error("boom"));
    const res = await patchRoute(mk("PATCH", "{}"), ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("PATCH 401 without key", async () => {
    vi.stubEnv("MCP_API_KEY", "secret");
    expect((await patchRoute(mk("PATCH", "{}"), ctx)).status).toBe(401);
  });

  it("PATCH 422 blocked when validation fails", async () => {
    mocked.getGuide.mockResolvedValue(fakeGuide);
    mocked.updateGuide.mockResolvedValue({ ...fakeGuide, board_id: "board.nope" });
    const res = await patchRoute(mk("PATCH", JSON.stringify({ board_id: "board.nope" })), ctx);
    expect(res.status).toBe(422);
    expect((await res.json()).blocked).toBe(true);
  });
});

describe("POST /api/guides/[id]/validate", () => {
  it("404 missing, 401 unauth, 500 on throw, 200 ok", async () => {
    mocked.getGuide.mockResolvedValue(null);
    expect((await validateRoute(mk("POST"), ctx)).status).toBe(404);

    mocked.getGuide.mockRejectedValue(new Error("x"));
    expect((await validateRoute(mk("POST"), ctx)).status).toBe(500);

    mocked.getGuide.mockResolvedValue(fakeGuide);
    const ok = await validateRoute(mk("POST"), ctx);
    expect(ok.status).toBe(200);
    expect((await ok.json()).blocked).toBe(true); // no power source -> not ok

    vi.stubEnv("MCP_API_KEY", "secret");
    expect((await validateRoute(mk("POST"), ctx)).status).toBe(401);
  });
});
