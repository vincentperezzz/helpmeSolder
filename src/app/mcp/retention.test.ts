import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

vi.mock("@/lib/guides/repository", () => ({
  createGuide: vi.fn(),
  getGuide: vi.fn(),
  updateGuide: vi.fn(),
}));

import { createGuide } from "@/lib/guides/repository";
import { POST } from "./route";

const guide = {
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
};

const rpc = (method: string, params: unknown = {}) =>
  new NextRequest("http://localhost/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

describe("create_guide retention message", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("MCP_API_KEY", "");
    vi.stubEnv("ALLOW_PUBLIC_API", "true");
    vi.stubEnv("GUIDE_RETENTION_DAYS", "21");
    resetRateLimits();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("includes retention days and message", async () => {
    vi.mocked(createGuide).mockResolvedValue(guide);
    const res = await POST(
      rpc("tools/call", { name: "create_guide", arguments: {} }),
    );
    const { result } = await res.json();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.retention.days).toBe(21);
    expect(payload.retention.message).toContain("21 days");
  });

  it("tells the model to mention expiry in the instructions", async () => {
    const res = await POST(
      rpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      }),
    );
    const { result } = await res.json();
    expect(result.instructions).toContain("retention.message");
  });
});
