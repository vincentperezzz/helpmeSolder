import { describe, expect, it } from "vitest";
import {
  isAllowedLicense,
  isImageUrl,
  modelTokens,
  splitQuery,
  titleMatches,
} from "./photo-shared";

describe("isAllowedLicense", () => {
  it.each([
    "CC0",
    "CC0 1.0",
    "Public domain",
    "PD-self",
    "No restrictions",
    "CC BY 2.0",
    "CC BY-SA 4.0",
    "CC BY-SA 3.0 de",
    "CC-BY-SA-4.0",
  ])("accepts %s", (name) => expect(isAllowedLicense(name)).toBe(true));

  it.each([
    "",
    "CC BY-NC 4.0",
    "CC BY-ND 2.0",
    "CC BY-NC-SA 3.0",
    "Fair use",
    "All rights reserved",
    "GFDL",
    "Attribution",
  ])("rejects %j", (name) => expect(isAllowedLicense(name)).toBe(false));
});

describe("isImageUrl", () => {
  it("allows only https on the known image hosts", () => {
    expect(isImageUrl("https://upload.wikimedia.org/a.jpg")).toBe(true);
    expect(isImageUrl("https://thumb.wikimedia.org/a.jpg")).toBe(true);
    expect(isImageUrl("https://api.openverse.org/v1/images/x/thumb/")).toBe(true);
    expect(isImageUrl("http://upload.wikimedia.org/a.jpg")).toBe(false);
    expect(isImageUrl("https://upload.wikimedia.org.evil.example/a.jpg")).toBe(false);
    expect(isImageUrl("https://live.staticflickr.com/a.jpg")).toBe(false);
    expect(isImageUrl(null)).toBe(false);
  });
});

describe("query helpers", () => {
  it("splits minus exclusions", () => {
    expect(splitQuery("tactile switch -keyboard -arcade")).toEqual({
      include: "tactile switch",
      exclude: ["keyboard", "arcade"],
    });
    expect(splitQuery("HC-SR04")).toEqual({ include: "HC-SR04", exclude: [] });
  });
  it("finds plain and hyphenated model numbers", () => {
    expect(modelTokens("DHT22 sensor")).toEqual(["dht22"]);
    expect(modelTokens("KY-038")).toEqual(["ky038"]);
    expect(modelTokens("Raspberry Pi 4")).toEqual([]);
  });
  it("matches hyphenated models as written in titles", () => {
    expect(titleMatches("File:KY-038.jpg", "KY-038")).toBe(true);
    expect(titleMatches("File:Ky-Mani Marley - 038.jpg", "KY-038")).toBe(false);
  });
});
