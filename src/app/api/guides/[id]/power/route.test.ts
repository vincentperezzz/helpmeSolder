import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Guide } from "@/lib/catalog/types";

vi.mock("@/lib/guides/repository", () => ({ getGuide: vi.fn(), updateGuide: vi.fn() }));
vi.mock("@/lib/requests/record", () => ({ recordPartRequestLater: vi.fn() }));

import { getGuide, updateGuide } from "@/lib/guides/repository";
import { recordPartRequestLater } from "@/lib/requests/record";
import { PUT } from "./route";

const guide: Guide = {
  id: "g1", title: "", power_source: null, board_id: null, parts: [], connections: [],
  steps: [], notes: [], created_at: "", updated_at: "",
};

function put(body: unknown) {
  return PUT(
    new NextRequest("http://localhost/api/guides/g1/power", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "g1" }) },
  );
}

beforeEach(() => {
  vi.stubEnv("ALLOW_PUBLIC_API", "true");
  vi.mocked(recordPartRequestLater).mockReset();
  vi.mocked(updateGuide).mockReset();
  vi.mocked(getGuide).mockResolvedValue(guide);
});
afterEach(() => vi.unstubAllEnvs());

describe("PUT /api/guides/[id]/power", () => {
  it("sets a supported value without recording", async () => {
    vi.mocked(updateGuide).mockResolvedValue(guide);
    const res = await put({ power_source: "battery_9v" });
    expect(res.status).toBe(200);
    expect(updateGuide).toHaveBeenCalledWith("g1", { power_source: "battery_9v" });
    expect(recordPartRequestLater).not.toHaveBeenCalled();
  });

  it("records an unsupported value and still returns the 400", async () => {
    const res = await put({ power_source: "CR2032 coin cell" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request body");
    expect(updateGuide).not.toHaveBeenCalled();
    expect(recordPartRequestLater).toHaveBeenCalledWith(
      expect.objectContaining({ name: "CR2032 coin cell", kind: "power", source: "set_power_source" }),
    );
  });
});
