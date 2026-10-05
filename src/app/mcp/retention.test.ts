import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

vi.mock("@/lib/guides/repository", () => ({
  createGuide: vi.fn(),
  getGuide: vi.fn(),
  updateGuide: vi.fn(),
}));

import { createGuide, getGuide } from "@/lib/guides/repository";
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

describe("retention message", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("MCP_API_KEY", "");
    vi.stubEnv("ALLOW_PUBLIC_API", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
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

  it("create_guide result carries no link", async () => {
    vi.mocked(createGuide).mockResolvedValue(guide);
    const res = await POST(
      rpc("tools/call", { name: "create_guide", arguments: {} }),
    );
    const { result } = await res.json();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.url).toBeUndefined();
    expect(result.content[0].text).not.toContain("/guides/");
  });

  it("validate_guide mentions the retention days when sharing", async () => {
    vi.mocked(getGuide).mockResolvedValue({
      ...guide,
      power_source: "usb_wall",
      board_id: "board.esp32.devkit",
      parts: [
        { instanceId: "mcu", catalogId: "board.esp32.devkit" },
        { instanceId: "buz", catalogId: "module.buzzer.active" },
      ],
      connections: [
        { id: "c1", from: { instanceId: "mcu", pinId: "D2" }, to: { instanceId: "buz", pinId: "1" } },
        { id: "c2", from: { instanceId: "mcu", pinId: "GND.1" }, to: { instanceId: "buz", pinId: "2" } },
      ],
      steps: [{ id: "s1", title: "Solder", body: "Solder.", order: 1 }],
    });
    const res = await POST(
      rpc("tools/call", { name: "validate_guide", arguments: { guide_id: "g1" } }),
    );
    const { result } = await res.json();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.shareUrl).toBe("http://localhost/guides/g1");
    expect(payload.message).toContain("21 days");
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
    expect(result.instructions).toContain("retention message");
    expect(result.instructions).toContain("shareUrl");
  });
});
