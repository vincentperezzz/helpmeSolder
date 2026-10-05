import type { Metadata } from "next";

export function adminMetadata(title: string): Metadata {
  return {
    title: `${title} | HelpmeSolder`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
    referrer: "no-referrer",
  };
}

export const UNAVAILABLE_TEXT = "The saved password could not be checked right now. Try again in a moment.";
