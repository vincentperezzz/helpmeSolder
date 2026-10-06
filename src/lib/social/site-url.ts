const FALLBACK_SITE_URL = "https://helpmesolder.vercel.app";

function isLocalOrigin(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(value);
}

function normalize(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

/**
 * Canonical public origin used for metadataBase, so og:image and og:url are
 * absolute. Mirrors getAppUrl (NEXT_PUBLIC_APP_URL) and also honours
 * NEXT_PUBLIC_SITE_URL and Vercel's production host. A localhost value is
 * ignored in production builds.
 */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const candidates = [
    normalize(env.NEXT_PUBLIC_SITE_URL),
    normalize(env.NEXT_PUBLIC_APP_URL),
    normalize(env.VERCEL_PROJECT_PRODUCTION_URL),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isLocalOrigin(candidate) && env.NODE_ENV === "production") continue;
    return candidate;
  }
  return FALLBACK_SITE_URL;
}
