import type { MetadataRoute } from "next";
import { UNFURL_BOT_TOKENS } from "@/lib/social/crawlers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/guides/", "/api/", "/mcp", "/admin"],
      },
      // Link-preview bots may fetch a shared guide URL to read its generic,
      // noindex social card. Everything else stays off limits.
      {
        userAgent: [...UNFURL_BOT_TOKENS],
        allow: ["/guides/"],
        disallow: ["/api/", "/mcp", "/admin"],
      },
    ],
  };
}
