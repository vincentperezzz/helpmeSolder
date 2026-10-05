import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/guides/repository", () => ({
  deleteExpiredGuides: vi.fn(),
}));

vi.mock("@/lib/analytics/clients", () => ({ purgeOldClients: vi.fn() }));

import { purgeOldClients } from "@/lib/analytics/clients";
import { deleteExpiredGuides } from "@/lib/guides/repository";
import { GET } from "./route";

const mk = (auth?: string) =>
  new NextRequest("http://localhost/api/cron/cleanup", {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(deleteExpiredGuides).mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/cleanup", () => {
  it("503 when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(mk("Bearer anything"));
    expect(res.status).toBe(503);
    expect(deleteExpiredGuides).not.toHaveBeenCalled();
  });

  it("401 on missing or wrong header", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await GET(mk())).status).toBe(401);
    expect((await GET(mk("Bearer wrong"))).status).toBe(401);
    expect((await GET(mk("s3cret"))).status).toBe(401);
    expect(deleteExpiredGuides).not.toHaveBeenCalled();
  });

  it("200 with deleted count and retention days", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("GUIDE_RETENTION_DAYS", "14");
    vi.mocked(deleteExpiredGuides).mockResolvedValue(3);
    const res = await GET(mk("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 3, retentionDays: 14 });
    expect(deleteExpiredGuides).toHaveBeenCalledWith(14);
    expect(purgeOldClients).toHaveBeenCalledWith(90);
  });

  it("500 generic when deletion fails", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.mocked(deleteExpiredGuides).mockRejectedValue(new Error("db down"));
    const res = await GET(mk("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
