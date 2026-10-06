import { describe, expect, it } from "vitest";
import { isLinkPreviewBot } from "./crawlers";
import { buildGuideMetadata, buildSiteMetadata } from "./metadata";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  it("falls back to the production host", () => {
    expect(getSiteUrl({})).toBe("https://helpmesolder.vercel.app");
  });

  it("prefers NEXT_PUBLIC_SITE_URL, then APP_URL, then the Vercel host", () => {
    expect(
      getSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://a.example/",
        NEXT_PUBLIC_APP_URL: "https://b.example",
      }),
    ).toBe("https://a.example");
    expect(getSiteUrl({ NEXT_PUBLIC_APP_URL: "https://b.example/x" })).toBe("https://b.example");
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "solder.example" })).toBe(
      "https://solder.example",
    );
  });

  it("ignores localhost in production but keeps it in dev", () => {
    const env = { NEXT_PUBLIC_APP_URL: "http://localhost:3000" };
    expect(getSiteUrl({ ...env, NODE_ENV: "production" })).toBe("https://helpmesolder.vercel.app");
    expect(getSiteUrl({ ...env, NODE_ENV: "development" })).toBe("http://localhost:3000");
  });
});

describe("buildSiteMetadata", () => {
  it("emits an absolute base, website og type and a large twitter card", () => {
    const meta = buildSiteMetadata("https://helpmesolder.vercel.app");
    expect(String(meta.metadataBase)).toBe("https://helpmesolder.vercel.app/");
    expect(meta.openGraph).toMatchObject({ type: "website", siteName: "HelpmeSolder", locale: "en_US" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
    expect(meta.title).toBe("HelpmeSolder");
  });
});

describe("buildGuideMetadata", () => {
  it("is fixed text, noindex, and takes no guide input", () => {
    expect(buildGuideMetadata.length).toBe(0);
    const meta = buildGuideMetadata();
    expect(meta.openGraph).toMatchObject({ title: "A HelpmeSolder guide" });
    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(meta.referrer).toBe("no-referrer");
    expect(JSON.stringify(meta)).not.toMatch(/guides\//);
  });
});

describe("isLinkPreviewBot", () => {
  it("recognises unfurl bots only", () => {
    expect(isLinkPreviewBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
    expect(isLinkPreviewBot("WhatsApp/2.23.20 A")).toBe(true);
    expect(isLinkPreviewBot("Mozilla/5.0 (Windows NT 10.0) Chrome/120")).toBe(false);
    expect(isLinkPreviewBot(null)).toBe(false);
  });
});
