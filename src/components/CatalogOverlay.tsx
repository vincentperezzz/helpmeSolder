"use client";

import { useMemo, type ReactNode } from "react";
import { applyClientOverlay, type ClientOverlay } from "@/lib/catalog/client-overlay";

/**
 * Applies the server's catalog overlay to this module graph's registry during
 * render (not in an effect), so SSR output and hydration use the same data.
 */
export function CatalogOverlay({ overlay, children }: { overlay: ClientOverlay; children: ReactNode }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by version on purpose
  useMemo(() => applyClientOverlay(overlay), [overlay.version]);
  return <>{children}</>;
}
