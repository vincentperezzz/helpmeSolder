import { scrollDelta } from "./model";

/** Marks the single scroll container of the right panel. */
export const SCROLL_ATTR = "data-ga-scroll";
/** Marks a strip that sticks to the top of a tab and covers content under it. */
export const STICKY_ATTR = "data-ga-sticky";

/**
 * Brings a row into view by scrolling only the panel container. Unlike
 * scrollIntoView this can never move the window or any other ancestor.
 */
export function scrollRowIntoPanel(row: HTMLElement | null | undefined) {
  if (!row || row.offsetParent === null) return;
  const container = row.closest<HTMLElement>(`[${SCROLL_ATTR}]`);
  if (!container) return;

  const box = container.getBoundingClientRect();
  const rect = row.getBoundingClientRect();
  const sticky = row
    .closest<HTMLElement>("[role='tabpanel']")
    ?.querySelector<HTMLElement>(`[${STICKY_ATTR}]`);
  const inset = sticky ? sticky.getBoundingClientRect().height : 0;

  const delta = scrollDelta(rect.top - box.top, rect.bottom - box.top, container.clientHeight, inset);
  if (delta === 0) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  container.scrollBy({ top: delta, behavior: calm ? "auto" : "smooth" });
}
