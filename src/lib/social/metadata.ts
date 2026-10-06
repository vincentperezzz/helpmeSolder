import type { Metadata } from "next";

export const SITE_NAME = "HelpmeSolder";
export const SITE_TITLE = "HelpmeSolder";
export const SITE_DESCRIPTION =
  "Step-by-step soldering guides that show exactly what to solder and where, with no circuit diagrams to decode.";
export const SITE_TAGLINE = "Soldering guides you can just follow.";

export const GUIDE_SOCIAL_TITLE = "A HelpmeSolder guide";
export const GUIDE_SOCIAL_DESCRIPTION = "Wiring and solder steps for your build";

/** Site-wide defaults. The image comes from the opengraph-image/twitter-image files. */
export function buildSiteMetadata(siteUrl: string): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
  };
}

/**
 * Guide links are secret, so the social preview is fixed text. It takes no
 * arguments on purpose: nothing about a guide can leak into an unfurl.
 */
export function buildGuideMetadata(): Metadata {
  return {
    title: "Guide | HelpmeSolder",
    description: "Private build guide",
    referrer: "no-referrer",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: GUIDE_SOCIAL_TITLE,
      description: GUIDE_SOCIAL_DESCRIPTION,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: GUIDE_SOCIAL_TITLE,
      description: GUIDE_SOCIAL_DESCRIPTION,
    },
  };
}
