import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn();
const select = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({ from }),
}));

import { GET } from "./route";

const mk = (auth?: string) =>
  new NextRequest("http://localhost/api/cron/keepalive", {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  from.mockClear();
  select.mockClear();
  limit.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/keepalive", () => {
  it("503 when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(mk("Bearer anything"));
    expect(res.status).toBe(503);
    expect(from).not.toHaveBeenCalled();
  });

  it("401 on missing or wrong header", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await GET(mk())).status).toBe(401);
    expect((await GET(mk("Bearer wrong"))).status).toBe(401);
    expect((await GET(mk("s3cret"))).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("runs a single-row read and returns ok", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    limit.mockResolvedValue({ data: [], error: null });
    const res = await GET(mk("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith("guides");
    expect(select).toHaveBeenCalledWith("id");
    expect(limit).toHaveBeenCalledWith(1);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.at).toBe("string");
  });

  it("500 generic when the database read fails", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    limit.mockResolvedValue({ data: null, error: new Error("db down") });
    const res = await GET(mk("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
