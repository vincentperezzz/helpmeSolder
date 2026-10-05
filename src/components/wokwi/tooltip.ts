import type { CatalogPart } from "@/lib/catalog/types";
import { partCategory } from "@/lib/catalog/part-media";
import type { WireItem } from "@/lib/guides/solder-plan";
import { wireColorName } from "./labels";

export type TooltipContent = {
  title: string;
  /** Small type tag, e.g. "Board" or "Output". Parts only. */
  tag?: string;
  detail?: string;
};

/** Text for a part. Shows the guide's own label if there is one, never the internal id. */
export function partTooltip(
  guideLabel: string | undefined,
  catalog: CatalogPart | undefined,
  fallbackName: string,
): TooltipContent {
  const title = guideLabel?.trim() || catalog?.name || fallbackName;
  const named = catalog?.name && catalog.name !== title ? `${catalog.name}. ` : "";
  return {
    title,
    tag: partCategory(catalog),
    detail: `${named}${catalog?.description ?? ""}`.trim() || undefined,
  };
}

/**
 * Text for a wire: the checklist sentence plus the colour, e.g.
 * "Alarm, pin 1 (SIG) to ESP32 DevKit V1, pin D13 (red wire)".
 */
export function wireTooltip(
  item: Pick<WireItem, "sentence" | "why"> | undefined,
  fallbackTitle: string,
  color: string,
): TooltipContent {
  const base = item?.sentence ?? fallbackTitle;
  return {
    title: `${base} (${wireColorName(color)} wire)`,
    detail: item?.why ?? undefined,
  };
}

/** One line for aria-label. */
export function tooltipLabel(content: TooltipContent): string {
  return [content.title, content.tag, content.detail].filter(Boolean).join(". ");
}

/** Keep a tooltip box of `size` inside the viewport, next to the anchor point. */
export function placeTooltip(
  anchor: { x: number; y: number },
  size: { w: number; h: number },
  viewport: { w: number; h: number },
  margin = 8,
  offset = 14,
): { left: number; top: number } {
  let left = anchor.x + offset;
  if (left + size.w + margin > viewport.w) left = anchor.x - offset - size.w;
  let top = anchor.y + offset;
  if (top + size.h + margin > viewport.h) top = anchor.y - offset - size.h;
  return {
    left: Math.max(margin, Math.min(left, viewport.w - size.w - margin)),
    top: Math.max(margin, Math.min(top, viewport.h - size.h - margin)),
  };
}
