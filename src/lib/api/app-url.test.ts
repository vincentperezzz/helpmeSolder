import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "./app-url";

const req = (url: string) => new Request(url);

describe("getAppUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the request origin when nothing is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getAppUrl(req("https://helpmesolder.vercel.app/mcp"))).toBe(
      "https://helpmesolder.vercel.app",
    );
  });

  it("prefers a configured public URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/");
    expect(getAppUrl(req("https://other.vercel.app/mcp"))).toBe("https://example.com");
  });

  it("ignores a localhost value when served from a real host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(getAppUrl(req("https://helpmesolder.vercel.app/mcp"))).toBe(
      "https://helpmesolder.vercel.app",
    );
  });

  it("keeps a localhost value when running locally", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(getAppUrl(req("http://localhost:3200/mcp"))).toBe("http://localhost:3000");
  });
});
