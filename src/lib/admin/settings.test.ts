import { describe, expect, it } from "vitest";
import {
  authorizeArea,
  isDefaultDisabled,
  resolveCredential,
  sessionKeyFor,
  verifyAgainstCredential,
} from "./credential";
import { hashPassword, validateNewPassword, verifyPassword } from "./password";
import { createSessionToken, readSessionToken, verifySessionToken } from "./session";

describe("scrypt hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterz", hash)).toBe(false);
  });

  it("uses a fresh salt each time", async () => {
    expect(await hashPassword("same password 1")).not.toBe(await hashPassword("same password 1"));
  });

  it("rejects tampered and badly formatted hashes", async () => {
    const hash = await hashPassword("another long password");
    const parts = hash.split("$");
    const tampered = [...parts.slice(0, 5), Buffer.alloc(64, 1).toString("base64")].join("$");
    expect(await verifyPassword("another long password", tampered)).toBe(false);
    for (const bad of [
      "",
      "plain",
      "bcrypt$1$2$3$a$b",
      "scrypt$16384$8$1$onlyfive",
      "scrypt$3$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "scrypt$99999999$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "scrypt$x$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ]) {
      expect(await verifyPassword("another long password", bad)).toBe(false);
    }
  });
});

describe("credential resolution", () => {
  const stored = "scrypt$16384$8$1$salt$hash";
  it("prefers the stored hash over env and default", () => {
    expect(resolveCredential({ stored, envPassword: "e", disableDefault: false })?.source).toBe("stored");
    expect(resolveCredential({ stored, envPassword: undefined, disableDefault: true })?.source).toBe("stored");
  });
  it("uses env when nothing is stored", () => {
    expect(resolveCredential({ stored: null, envPassword: "e", disableDefault: false })?.source).toBe("env");
    expect(resolveCredential({ stored: null, envPassword: "e", disableDefault: true })?.source).toBe("env");
  });
  it("falls back to the built-in default, unless disabled", () => {
    expect(resolveCredential({ stored: null, envPassword: undefined, disableDefault: false })?.source).toBe("default");
    expect(resolveCredential({ stored: null, envPassword: "", disableDefault: false })?.source).toBe("default");
    expect(resolveCredential({ stored: null, envPassword: undefined, disableDefault: true })).toBeNull();
  });
  it("reads the disable flag", () => {
    expect(isDefaultDisabled("true")).toBe(true);
    expect(isDefaultDisabled("TRUE")).toBe(true);
    expect(isDefaultDisabled("false")).toBe(false);
    expect(isDefaultDisabled(undefined)).toBe(false);
  });
  it("verifies against each source", async () => {
    expect(await verifyAgainstCredential({ source: "default" }, "admin")).toBe(true);
    expect(await verifyAgainstCredential({ source: "default" }, "nope")).toBe(false);
    expect(await verifyAgainstCredential({ source: "env", password: "pw-env" }, "pw-env")).toBe(true);
    expect(await verifyAgainstCredential({ source: "env", password: "pw-env" }, "admin")).toBe(false);
    const hash = await hashPassword("stored password");
    expect(await verifyAgainstCredential({ source: "stored", hash }, "stored password")).toBe(true);
    expect(await verifyAgainstCredential({ source: "stored", hash }, "admin")).toBe(false);
  });
});

describe("restricted session", () => {
  const key = sessionKeyFor({ source: "default" }, "pepper");
  const now = 1_700_000_000_000;

  it("is only valid as restricted, never as full", () => {
    const { value } = createSessionToken(key, now, true);
    expect(readSessionToken(value, key, now + 1)).toBe("restricted");
    expect(verifySessionToken(value, key, now + 1)).toBe(false);
  });

  it("cannot be upgraded by dropping the flag", () => {
    const { value } = createSessionToken(key, now, true);
    const [expiry, , sig] = value.split(".");
    expect(readSessionToken(`${expiry}.${sig}`, key, now + 1)).toBeNull();
    expect(readSessionToken(`${expiry}.x.${sig}`, key, now + 1)).toBeNull();
  });

  it("lets a restricted session reach settings but not the dashboard", () => {
    expect(authorizeArea("restricted", "settings")).toEqual({ kind: "allow" });
    expect(authorizeArea("restricted", "dashboard")).toEqual({ kind: "settings" });
    expect(authorizeArea("full", "dashboard")).toEqual({ kind: "allow" });
    expect(authorizeArea("full", "settings")).toEqual({ kind: "allow" });
    expect(authorizeArea(null, "dashboard")).toEqual({ kind: "login" });
    expect(authorizeArea(null, "settings")).toEqual({ kind: "login" });
  });
});

describe("session key follows the credential", () => {
  const now = 1_700_000_000_000;
  it("invalidates old cookies when the password changes", () => {
    const oldKey = sessionKeyFor({ source: "stored", hash: "scrypt$1" }, "pepper");
    const newKey = sessionKeyFor({ source: "stored", hash: "scrypt$2" }, "pepper");
    const { value } = createSessionToken(oldKey, now);
    expect(verifySessionToken(value, oldKey, now + 1)).toBe(true);
    expect(verifySessionToken(value, newKey, now + 1)).toBe(false);
  });
  it("differs by source and pepper", () => {
    const keys = [
      sessionKeyFor({ source: "default" }, "p"),
      sessionKeyFor({ source: "env", password: "admin" }, "p"),
      sessionKeyFor({ source: "env", password: "admin" }, "q"),
    ];
    expect(new Set(keys).size).toBe(3);
  });
});

describe("password policy", () => {
  const ok = { current: "old-password-1", next: "a-good-new-password", confirm: "a-good-new-password" };
  it("accepts a good password", () => expect(validateNewPassword(ok)).toBeNull());
  it("rejects each bad case", () => {
    expect(validateNewPassword({ ...ok, confirm: "different" })).toBe("mismatch");
    expect(validateNewPassword({ ...ok, next: "short", confirm: "short" })).toBe("short");
    expect(validateNewPassword({ ...ok, next: "x".repeat(201), confirm: "x".repeat(201) })).toBe("long");
    expect(validateNewPassword({ ...ok, next: "ADMIN", confirm: "ADMIN" })).toBe("common");
    expect(validateNewPassword({ ...ok, current: ok.next })).toBe("same");
  });
});
