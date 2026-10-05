import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";
import type { Guide } from "@/lib/catalog/types";

vi.mock("@/lib/guides/repository", () => ({
  createGuide: vi.fn(),
  getGuide: vi.fn(),
  updateGuide: vi.fn(),
}));

vi.mock("@/lib/analytics/clients", () => ({ recordClientLater: vi.fn() }));

vi.mock("@/lib/requests/record", () => ({
  recordPartRequestLater: vi.fn(),
  resolveAlias: vi.fn(),
}));

vi.mock("@/lib/requests/search", () => ({ recordCatalogSearchLater: vi.fn() }));

import { recordClientLater } from "@/lib/analytics/clients";
import { recordCatalogSearchLater } from "@/lib/requests/search";
import { recordPartRequestLater, resolveAlias } from "@/lib/requests/record";
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
    vi.mocked(recordPartRequestLater).mockReset();
    vi.mocked(recordCatalogSearchLater).mockReset();
    vi.mocked(resolveAlias).mockReset().mockResolvedValue(null);
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
    expect(result.instructions).toContain("coin cell");
  });

  it("instructions put the questions before create_guide and name shareUrl", async () => {
    const res = await POST(
      rpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      }),
    );
    const { result } = await res.json();
    const text: string = result.instructions;
    expect(text).toContain("ASK FIRST");
    expect(text.indexOf("ASK FIRST")).toBeLessThan(text.indexOf("2. create_guide"));
    expect(text).toContain("shareUrl");
    expect(text).toContain("get_guide_link");
    expect(text).toContain("no gate");
    expect(text).toMatch(/NO link/);
    expect(text).not.toMatch(/tell the user the returned url/);
  });

  it("lists all fourteen tools", async () => {
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
        "get_guide_link",
        "get_part_details",
        "list_catalog",
        "request_part",
        "search_catalog",
        "set_power_source",
        "set_steps",
        "validate_guide",
      ].sort(),
    );
  });

  it("create_guide returns no url and tells the assistant not to share a link yet", async () => {
    vi.mocked(createGuide).mockResolvedValue(guide);
    const result = await callTool("create_guide", { title: "T" });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.url).toBeUndefined();
    expect(result.content[0].text).not.toContain("/guides/g1");
    expect(data.guide.id).toBe("g1");
    expect(data.validation).toBeDefined();
    expect(data.retention.message).toContain("deleted automatically");
    expect(data.next).toContain("Do NOT share any link yet");
    expect(data.next).toContain("validate_guide");
    expect(data.next).toContain("shareUrl");
    expect(createGuide).toHaveBeenCalledWith({ title: "T" });
    expect(recordClientLater).toHaveBeenCalledWith("creator", expect.anything());
  });

  describe("share link readiness", () => {
    const ready: Guide = {
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
      steps: [{ id: "s1", title: "Solder", body: "Solder the wires.", order: 1 }],
    };

    async function validate(g: Guide, tool = "validate_guide") {
      vi.mocked(getGuide).mockResolvedValue(g);
      const result = await callTool(tool, { guide_id: g.id });
      expect(result.isError).toBeFalsy();
      return JSON.parse(result.content[0].text);
    }

    it("returns shareUrl and a once-only message when the guide is ready", async () => {
      vi.stubEnv("GUIDE_RETENTION_DAYS", "21");
      const data = await validate(ready);
      expect(data.validation.ok).toBe(true);
      expect(data.readyToShare).toBe(true);
      expect(data.shareUrl).toBe("http://localhost/guides/g1");
      expect(data.missing).toBeUndefined();
      expect(data.message).toBe(
        "Share this link with the user once. Mention that guides are deleted if nobody opens them for 21 days.",
      );
    });

    it.each([
      ["power source", { power_source: null }, "power source not set (ask the user"],
      ["parts", { parts: [], connections: [] }, "no parts yet"],
      ["connections", { connections: [] }, "no connections yet"],
      ["steps", { steps: [] }, "no steps yet"],
    ])("withholds shareUrl when %s is missing", async (_name, patch, expected) => {
      const data = await validate({ ...ready, ...patch } as Guide);
      expect(data.readyToShare).toBe(false);
      expect(data.shareUrl).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain("/guides/g1");
      expect(data.missing.some((item: string) => item.includes(expected))).toBe(true);
      expect(data.next).toContain("Do NOT share a link yet");
    });

    it("withholds shareUrl and explains validation errors", async () => {
      const data = await validate({
        ...ready,
        connections: [
          ...ready.connections,
          { id: "c3", from: { instanceId: "mcu", pinId: "NOPE" }, to: { instanceId: "buz", pinId: "2" } },
        ],
      });
      expect(data.validation.ok).toBe(false);
      expect(data.readyToShare).toBe(false);
      expect(data.shareUrl).toBeUndefined();
      expect(data.missing.some((item: string) => item.startsWith("validation errors: "))).toBe(true);
    });

    it("lists every missing item for an empty guide, with no duplicate power entry", async () => {
      const data = await validate(guide);
      expect(data.readyToShare).toBe(false);
      expect(data.missing).toHaveLength(4);
      expect(data.missing.filter((item: string) => item.includes("power"))).toHaveLength(1);
    });

    it("get_guide_link returns the same readiness result", async () => {
      expect(await validate(ready, "get_guide_link")).toEqual(await validate(ready));
      const notReady = await validate({ ...ready, steps: [] }, "get_guide_link");
      expect(notReady.readyToShare).toBe(false);
      expect(notReady.shareUrl).toBeUndefined();
      expect(updateGuide).not.toHaveBeenCalled();
    });

    it("get_guide_link reports a missing guide", async () => {
      vi.mocked(getGuide).mockResolvedValue(null);
      const result = await callTool("get_guide_link", { guide_id: "nope" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Guide not found");
    });

    it("get_guide does not return the link even for a ready guide", async () => {
      vi.mocked(getGuide).mockResolvedValue(ready);
      const result = await callTool("get_guide", { guide_id: "g1" });
      expect(result.content[0].text).not.toContain("/guides/g1");
      expect(result.content[0].text).not.toContain("shareUrl");
    });

    it("write tools never return a link", async () => {
      vi.mocked(getGuide).mockResolvedValue(ready);
      vi.mocked(updateGuide).mockResolvedValue(ready);
      const result = await callTool("set_steps", { guide_id: "g1", steps: ready.steps });
      expect(result.content[0].text).not.toContain("/guides/g1");
      expect(result.content[0].text).not.toContain("shareUrl");
    });
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
    expect(recordPartRequestLater).toHaveBeenCalledWith(
      expect.objectContaining({ name: "nope.nothing", source: "add_part" }),
    );
  });

  it("add_part miss suggests the closest supported parts", async () => {
    const result = await callTool("add_part", {
      guide_id: "g1",
      instanceId: "x",
      catalogId: "DHT 21",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("module.dht22");
    expect(result.content[0].text).toContain("request_part");
  });

  it("add_part uses an admin alias for an unknown id", async () => {
    vi.mocked(resolveAlias).mockResolvedValue("module.buzzer.active");
    vi.mocked(getGuide).mockResolvedValue(guide);
    vi.mocked(updateGuide).mockResolvedValue(guide);
    const result = await callTool("add_part", { guide_id: "g1", instanceId: "b", catalogId: "buzzer-x" });
    expect(result.isError).toBeFalsy();
    expect(updateGuide).toHaveBeenCalledWith("g1", {
      parts: [{ instanceId: "b", catalogId: "module.buzzer.active", label: undefined }],
    });
    expect(recordPartRequestLater).not.toHaveBeenCalled();
  });

  it("create_guide records an unknown board_id and still creates the guide", async () => {
    vi.mocked(createGuide).mockResolvedValue(guide);
    const result = await callTool("create_guide", { board_id: "board.nope" });
    expect(result.isError).toBeFalsy();
    expect(recordPartRequestLater).toHaveBeenCalledWith(
      expect.objectContaining({ name: "board.nope", source: "add_part" }),
    );
  });

  it("search_catalog returns close parts and records the search once, not a part request", async () => {
    const result = await callTool("search_catalog", { query: "DHT 22" });
    const data = JSON.parse(result.content[0].text);
    expect(data.results[0].id).toBe("module.dht22");
    expect(recordPartRequestLater).not.toHaveBeenCalled();
    expect(recordCatalogSearchLater).toHaveBeenCalledTimes(1);
    expect(recordCatalogSearchLater).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "DHT 22",
        source: "search_catalog",
        resultCount: data.results.length,
        topMatchId: "module.dht22",
      }),
    );
  });

  it("search_catalog results carry category, summary and identify hint", async () => {
    const result = await callTool("search_catalog", { query: "active buzzer" });
    const data = JSON.parse(result.content[0].text);
    expect(data.results[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), category: expect.any(String), summary: expect.any(String) }),
    );
    expect(data.results[0]).toHaveProperty("identify");
  });

  it("list_catalog stays compact with summary and category", async () => {
    const result = await callTool("list_catalog", {});
    const data = JSON.parse(result.content[0].text);
    const part = data.modules.find((p: { id: string }) => p.id === "module.buzzer.active");
    expect(part.summary).toBeTruthy();
    expect(part.category).toBeTruthy();
    expect(part.pins).toBeUndefined();
    expect(part.watchOuts).toBeUndefined();
  });

  it("get_part_details returns full detail, plain-word limits and related parts", async () => {
    const result = await callTool("get_part_details", { catalog_id: "module.buzzer.active" });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe("module.buzzer.active");
    expect(data.category).toBeTruthy();
    expect(data.description).toBeTruthy();
    expect(data.pins.length).toBeGreaterThan(0);
    expect(Array.isArray(data.watchOuts)).toBe(true);
    expect(Array.isArray(data.variants)).toBe(true);
    expect(Array.isArray(data.electrical)).toBe(true);
    expect(recordPartRequestLater).not.toHaveBeenCalled();
  });

  it("get_part_details lists look-alike family parts (I2C vs parallel LCD)", async () => {
    const result = await callTool("get_part_details", { catalog_id: "module.lcd.i2c.1602" });
    const data = JSON.parse(result.content[0].text);
    expect(data.relatedParts.map((p: { id: string }) => p.id)).toContain("module.lcd.parallel.1602");
  });

  it("get_part_details on an unknown id suggests close parts", async () => {
    const result = await callTool("get_part_details", { catalog_id: "DHT 22" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("module.dht22");
  });

  it("get_part_details leaks no internal fields", async () => {
    const result = await callTool("get_part_details", { catalog_id: "module.dht22" });
    const text = result.content[0].text;
    for (const key of ["photoHint", "wokwi", "matchesGuide", "inputHighFraction"]) {
      expect(text).not.toContain(key);
    }
  });

  it("search_catalog records a search with no match as zero results", async () => {
    const result = await callTool("search_catalog", { query: "zzqxv unobtainium" });
    const data = JSON.parse(result.content[0].text);
    expect(data.results).toEqual([]);
    expect(recordCatalogSearchLater).toHaveBeenCalledWith(
      expect.objectContaining({ resultCount: 0, topMatchId: undefined }),
    );
  });

  it("ask_sensor records its intent once with the match count", async () => {
    const result = await callTool("ask_sensor", { intent: "measure distance" });
    expect(JSON.parse(result.content[0].text).intent).toBe("measure distance");
    expect(recordCatalogSearchLater).toHaveBeenCalledTimes(1);
    expect(recordCatalogSearchLater).toHaveBeenCalledWith(
      expect.objectContaining({ query: "measure distance", source: "ask_sensor" }),
    );
  });

  it("ask_sensor does not record an empty or missing intent", async () => {
    await callTool("ask_sensor", {});
    await callTool("ask_sensor", { intent: "   " });
    expect(recordCatalogSearchLater).not.toHaveBeenCalled();
  });

  it("request_part records an unsupported part", async () => {
    const result = await callTool("request_part", {
      name: "Zorblax 9000 Quantum Flux Sensor",
      kind: "sensor",
      reason: "needs I2C",
      pins: [{ id: "1", label: "SDA" }],
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toMatchObject({ recorded: true, supported: false });
    expect(data.nextStep).toMatch(/Never invent a catalog id/);
    expect(recordPartRequestLater).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Zorblax 9000 Quantum Flux Sensor",
        kind: "sensor",
        source: "request_part",
        note: "needs I2C",
      }),
    );
  });

  it("request_part answers supported for a strong catalog match without recording", async () => {
    const result = await callTool("request_part", { name: "HC-SR04" });
    const data = JSON.parse(result.content[0].text);
    expect(data).toMatchObject({ supported: true, catalogId: "module.hc-sr04" });
    expect(recordPartRequestLater).not.toHaveBeenCalled();
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

  it("set_power_source keeps supported values working", async () => {
    vi.mocked(getGuide).mockResolvedValue(guide);
    vi.mocked(updateGuide).mockResolvedValue(guide);
    await callTool("set_power_source", { guide_id: "g1", power_source: "battery_18650" });
    expect(updateGuide).toHaveBeenCalledWith("g1", { power_source: "battery_18650" });
    expect(recordPartRequestLater).not.toHaveBeenCalled();
  });

  it("set_power_source maps common synonyms", async () => {
    vi.mocked(getGuide).mockResolvedValue(guide);
    vi.mocked(updateGuide).mockResolvedValue(guide);
    await callTool("set_power_source", { guide_id: "g1", power_source: "9 volt" });
    expect(updateGuide).toHaveBeenCalledWith("g1", { power_source: "battery_9v" });
    await callTool("set_power_source", { guide_id: "g1", power_source: "2 x AA" });
    expect(updateGuide).toHaveBeenLastCalledWith("g1", { power_source: "battery_2aa" });
    expect(recordPartRequestLater).not.toHaveBeenCalled();
  });

  it("set_power_source records an unsupported source and leaves the guide alone", async () => {
    const result = await callTool("set_power_source", {
      guide_id: "g1",
      power_source: "CR2032 coin cell",
      description: "tiny badge",
    });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data).toMatchObject({ supported: false, recorded: true });
    expect(data.supportedOptions.map((o: { id: string }) => o.id)).toContain("battery_9v");
    expect(data.nextStep).toMatch(/Do not guess/);
    expect(getGuide).not.toHaveBeenCalled();
    expect(updateGuide).not.toHaveBeenCalled();
    expect(recordPartRequestLater).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "CR2032 coin cell",
        kind: "power",
        source: "set_power_source",
        note: "tiny badge",
      }),
    );
  });

  it("set_power_source resolves an admin alias to a supported value", async () => {
    vi.mocked(resolveAlias).mockResolvedValue("battery_9v");
    vi.mocked(getGuide).mockResolvedValue(guide);
    vi.mocked(updateGuide).mockResolvedValue(guide);
    await callTool("set_power_source", { guide_id: "g1", power_source: "PP3 block" });
    expect(updateGuide).toHaveBeenCalledWith("g1", { power_source: "battery_9v" });
    expect(recordPartRequestLater).not.toHaveBeenCalled();
  });

  it("set_power_source ignores an alias that is not a supported power value", async () => {
    vi.mocked(resolveAlias).mockResolvedValue("module.buzzer.active");
    const result = await callTool("set_power_source", { guide_id: "g1", power_source: "solar panel" });
    expect(JSON.parse(result.content[0].text).supported).toBe(false);
    expect(updateGuide).not.toHaveBeenCalled();
    expect(recordPartRequestLater).toHaveBeenCalled();
  });

  it("ask_power_source tells the assistant to note unlisted types", async () => {
    const result = await callTool("ask_power_source", {});
    const data = JSON.parse(result.content[0].text);
    expect(data.nextStep).toContain("coin cell");
    expect(data.nextStep).toContain("set_power_source");
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
