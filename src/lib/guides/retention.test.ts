import { afterEach, describe, expect, it, vi } from "vitest";
import { getExpiryDate, getRetentionDays, retentionNotice } from "./retention";

afterEach(() => vi.unstubAllEnvs());

describe("retention helpers", () => {
  it("defaults to 30 days and parses the env var", () => {
    vi.stubEnv("GUIDE_RETENTION_DAYS", "");
    expect(getRetentionDays()).toBe(30);
    vi.stubEnv("GUIDE_RETENTION_DAYS", "7");
    expect(getRetentionDays()).toBe(7);
  });

  it("ignores invalid, zero and negative values", () => {
    for (const bad of ["abc", "0", "-5"]) {
      vi.stubEnv("GUIDE_RETENTION_DAYS", bad);
      expect(getRetentionDays()).toBe(30);
    }
  });

  it("computes expiry and notice text", () => {
    const expiry = getExpiryDate("2026-01-01T00:00:00.000Z", 10);
    expect(expiry.toISOString()).toBe("2026-01-11T00:00:00.000Z");
    expect(retentionNotice(5)).toContain("5 days");
  });
});
