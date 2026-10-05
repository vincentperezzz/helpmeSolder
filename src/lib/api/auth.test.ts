import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertApiAuth } from "./auth";

const req = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/x", { headers });

describe("assertApiAuth", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("503 when nothing is configured in production", async () => {
    vi.stubEnv("MCP_API_KEY", "");
    vi.stubEnv("ALLOW_PUBLIC_API", "");
    vi.stubEnv("NODE_ENV", "production");
    const res = assertApiAuth(req());
    expect(res?.status).toBe(503);
  });

  it("allows anonymous requests in production when ALLOW_PUBLIC_API=true", () => {
    vi.stubEnv("MCP_API_KEY", "");
    vi.stubEnv("ALLOW_PUBLIC_API", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(assertApiAuth(req())).toBeNull();
  });

  it("still rejects a wrong key when public access is on and a key is set", () => {
    vi.stubEnv("MCP_API_KEY", "secret");
    vi.stubEnv("ALLOW_PUBLIC_API", "true");
    expect(assertApiAuth(req({ authorization: "Bearer nope" }))?.status).toBe(401);
    expect(assertApiAuth(req())).toBeNull();
    expect(assertApiAuth(req({ authorization: "Bearer secret" }))).toBeNull();
  });

  it("allows when key unset in development", () => {
    vi.stubEnv("MCP_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(assertApiAuth(req())).toBeNull();
  });

  it("401 when key set and token missing or wrong", async () => {
    vi.stubEnv("MCP_API_KEY", "secret");
    vi.stubEnv("ALLOW_PUBLIC_API", "");
    expect(assertApiAuth(req())?.status).toBe(401);
    expect(assertApiAuth(req({ authorization: "Bearer nope" }))?.status).toBe(401);
    expect(assertApiAuth(req({ "x-api-key": "nope" }))?.status).toBe(401);
    expect(assertApiAuth(req({ authorization: "Basic secret" }))?.status).toBe(401);
  });

  it("accepts Bearer and x-api-key", () => {
    vi.stubEnv("MCP_API_KEY", "secret");
    expect(assertApiAuth(req({ authorization: "Bearer secret" }))).toBeNull();
    expect(assertApiAuth(req({ "x-api-key": "secret" }))).toBeNull();
  });
});
