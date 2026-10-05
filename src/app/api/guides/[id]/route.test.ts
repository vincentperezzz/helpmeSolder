import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Guide } from "@/lib/catalog/types";

vi.mock("@/lib/guides/repository", () => ({ getGuide: vi.fn(), updateGuide: vi.fn() }));
vi.mock("@/lib/requests/record", () => ({ recordPartRequestLater: vi.fn() }));

import { getGuide, updateGuide } from "@/lib/guides/repository";
import { recordPartRequestLater } from "@/lib/requests/record";
import { PATCH } from "./route";

const base: Guide = {
  id: "g1", title: "", power_source: null, board_id: null, parts: [], connections: [],
  steps: [], notes: [], created_at: "", updated_at: "",
};

const patch = () =>
  PATCH(
    new NextRequest("http://localhost/api/guides/g1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    }),
    { params: Promise.resolve({ id: "g1" }) },
  );

beforeEach(() => {
  vi.stubEnv("ALLOW_PUBLIC_API", "true");
  vi.mocked(recordPartRequestLater).mockReset();
  vi.mocked(getGuide).mockResolvedValue(base);
});
afterEach(() => vi.unstubAllEnvs());

describe("PATCH /api/guides/[id]", () => {
  it("records a miss for each unknown catalog id and keeps the 422 response", async () => {
    vi.mocked(updateGuide).mockResolvedValue({
      ...base,
      parts: [
        { instanceId: "a", catalogId: "module.nope" },
        { instanceId: "b", catalogId: "module.buzzer.active" },
      ],
    });
    const res = await patch();
    expect(res.status).toBe(422);
    expect(recordPartRequestLater).toHaveBeenCalledTimes(1);
    expect(recordPartRequestLater).toHaveBeenCalledWith(
      expect.objectContaining({ name: "module.nope", source: "api_patch" }),
    );
  });
  it("records nothing when all parts are known", async () => {
    vi.mocked(updateGuide).mockResolvedValue({
      ...base,
      parts: [{ instanceId: "b", catalogId: "module.buzzer.active" }],
    });
    await patch();
    expect(recordPartRequestLater).not.toHaveBeenCalled();
  });
});
