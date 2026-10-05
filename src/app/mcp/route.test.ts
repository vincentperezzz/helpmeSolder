import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";
import type { Guide } from "@/lib/catalog/types";

vi.mock("@/lib/guides/repository", () => ({
  createGuide: vi.fn(),
  getGuide: vi.fn(),
  updateGuide: vi.fn(),
}));

import { createGuide, getGuide, updateGuide } from "@/lib/guides/repository";
import { DELETE, GET, POST } from "./route";

const guide: Guide = {
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

function rpc(method: string, params: unknown = {}, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function callTool(name: string, args: Record<string, unknown>) {
  const res = await POST(rpc("tools/call", { name, arguments: args }));
  const body = await res.json();
  return body.result as { content: { text: string }[]; isError?: boolean };
}

describe("remote MCP endpoint", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("MCP_API_KEY", "");
    vi.stubEnv("ALLOW_PUBLIC_API", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    resetRateLimits();
    vi.mocked(createGuide).mockReset();
    vi.mocked(getGuide).mockReset();
    vi.mocked(updateGuide).mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("initializes and advertises the flow instructions", async () => {
    const res = await POST(
      rpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      }),
    );
    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(result.serverInfo.name).toBe("helpmesolder");
    expect(result.instructions).toContain("ask_power_source");
  });

  it("lists all ten tools", async () => {
    const res = await POST(rpc("tools/list"));
    const { result } = await res.json();
    const names = result.tools.map((tool: { name: string }) => tool.name).sort();
    expect(names).toEqual(
      [
        "add_connection",
        "add_part",
        "ask_power_source",
        "ask_sensor",
        "create_guide",
        "get_guide",
        "list_catalog",
        "set_power_source",
        "set_steps",
        "validate_guide",
      ].sort(),
    );
  });

  it("create_guide returns a link on the request origin", async () => {
    vi.mocked(createGuide).mockResolvedValue(guide);
    const result = await callTool("create_guide", { title: "T" });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(result.content[0].text).url).toBe("http://localhost/guides/g1");
    expect(createGuide).toHaveBeenCalledWith({ title: "T" });
  });

  it("add_part rejects an unknown catalog id without touching the database", async () => {
    const result = await callTool("add_part", {
      guide_id: "g1",
      instanceId: "x",
      catalogId: "nope.nothing",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Unknown catalog part/);
    expect(updateGuide).not.toHaveBeenCalled();
  });

  it("add_part replaces a part with the same instanceId", async () => {
    vi.mocked(getGuide).mockResolvedValue({
      ...guide,
      parts: [{ instanceId: "a", catalogId: "old" }],
    });
    vi.mocked(updateGuide).mockResolvedValue(guide);
    await callTool("add_part", { guide_id: "g1", instanceId: "a", catalogId: "module.buzzer.active" });
    expect(updateGuide).toHaveBeenCalledWith("g1", {
      parts: [{ instanceId: "a", catalogId: "module.buzzer.active", label: undefined }],
    });
  });

  it("set_power_source maps the generic battery value", async () => {
    vi.mocked(getGuide).mockResolvedValue(guide);
    vi.mocked(updateGuide).mockResolvedValue(guide);
    await callTool("set_power_source", { guide_id: "g1", power_source: "battery" });
    expect(updateGuide).toHaveBeenCalledWith("g1", { power_source: "battery_3aa" });
  });

  it("returns a tool error for a missing guide", async () => {
    vi.mocked(getGuide).mockResolvedValue(null);
    const result = await callTool("get_guide", { guide_id: "nope" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Guide not found");
  });

  it("hides internals when the repository throws", async () => {
    vi.mocked(getGuide).mockRejectedValue(new Error("db password leaked"));
    const result = await callTool("get_guide", { guide_id: "g1" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Internal server error");
  });

  it("rate limits guide creation", async () => {
    vi.stubEnv("RATE_LIMIT_CREATE_PER_HOUR", "1");
    vi.mocked(createGuide).mockResolvedValue(guide);
    expect((await callTool("create_guide", {})).isError).toBeFalsy();
    const second = await callTool("create_guide", {});
    expect(second.isError).toBe(true);
    expect(second.content[0].text).toMatch(/Rate limit exceeded/);
  });

  it("is blocked when auth is not configured in production", async () => {
    vi.stubEnv("ALLOW_PUBLIC_API", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(rpc("tools/list"))).status).toBe(503);
  });

  it("requires the key when one is set and public access is off", async () => {
    vi.stubEnv("ALLOW_PUBLIC_API", "");
    vi.stubEnv("MCP_API_KEY", "secret");
    expect((await POST(rpc("tools/list"))).status).toBe(401);
    expect(
      (await POST(rpc("tools/list", {}, { authorization: "Bearer secret" }))).status,
    ).toBe(200);
  });

  it("answers GET and DELETE with 405 so no stream is left open", async () => {
    const get = await GET();
    expect(get.status).toBe(405);
    expect(get.headers.get("allow")).toBe("POST");
    expect((await DELETE()).status).toBe(405);
  });
});
