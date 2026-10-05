import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics/clients", async (orig) => ({
  ...(await orig<typeof import("@/lib/analytics/clients")>()),
  recordClient: vi.fn().mockResolvedValue(undefined),
}));

import { HIT_LIMIT, recordClient } from "@/lib/analytics/clients";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { POST } from "./route";

const mk = () => new NextRequest("http://localhost/api/hit", { method: "POST" });

beforeEach(() => {
  resetRateLimits();
  vi.mocked(recordClient).mockClear();
});

describe("POST /api/hit", () => {
  it("returns 204 without auth and records a visitor", async () => {
    const res = await POST(mk());
    expect(res.status).toBe(204);
    expect(recordClient).toHaveBeenCalledWith("visitor", expect.anything());
  });
  it("returns 429 over the limit", async () => {
    for (let i = 0; i < HIT_LIMIT.limit; i++) await POST(mk());
    const res = await POST(mk());
    expect(res.status).toBe(429);
  });
});
