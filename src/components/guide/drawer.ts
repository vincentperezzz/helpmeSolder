/**
 * Phone drawer: three snap points (peek, split, full) and the pure decisions
 * about where a drag or a key press ends up. No DOM in here.
 */

export const SNAPS = ["peek", "split", "full"] as const;
export type Snap = (typeof SNAPS)[number];

/** The same test the stylesheet uses for "phone": not a wide window and not a short landscape phone. */
export const PHONE_QUERY =
  "not all and ((min-width: 1024px) or ((min-width: 640px) and (max-height: 560px) and (orientation: landscape)))";

export const PEEK_PX = 56;
export const SPLIT_SHARE = 0.45;
/** Share of the gap to the next snap point a drag must cover to move there. */
export const COMMIT_SHARE = 0.35;
/** px per ms. At or above this a release counts as a flick. */
export const FLICK_SPEED = 0.5;
/** Pixels of movement before a press stops being a tap. */
export const TAP_SLOP = 6;

export type DrawerHeights = Record<Snap, number>;

export function drawerHeights(viewportHeight: number, fullPx: number): DrawerHeights {
  const full = Math.max(fullPx, PEEK_PX);
  const split = Math.min(Math.max(Math.round(viewportHeight * SPLIT_SHARE), PEEK_PX), full);
  return { peek: PEEK_PX, split, full };
}

/** Diminishing returns past an edge: the further you pull, the less it moves. */
export function rubberBand(excess: number, limit = 120): number {
  if (excess <= 0) return 0;
  return limit * (1 - 1 / (excess / (limit * 2) + 1));
}

/** Drawer height while a finger is down. dy is positive when the finger moved down. */
export function dragHeight(startHeight: number, dy: number, heights: DrawerHeights): number {
  const raw = startHeight - dy;
  if (raw > heights.full) return heights.full + rubberBand(raw - heights.full);
  if (raw < heights.peek) return heights.peek - rubberBand(heights.peek - raw, 24);
  return raw;
}

export function higher(snap: Snap): Snap {
  return SNAPS[Math.min(SNAPS.indexOf(snap) + 1, SNAPS.length - 1)];
}

export function lower(snap: Snap): Snap {
  return SNAPS[Math.max(SNAPS.indexOf(snap) - 1, 0)];
}

/**
 * Where a release lands. velocity is px/ms, positive when moving down.
 * A flick moves one step; otherwise the drawer advances past a snap point once
 * the drag covered COMMIT_SHARE of the way to it, and may cross several.
 */
export function pickSnap({
  start,
  height,
  velocity,
  heights,
}: {
  start: Snap;
  height: number;
  velocity: number;
  heights: DrawerHeights;
}): Snap {
  if (velocity >= FLICK_SPEED) return lower(start);
  if (velocity <= -FLICK_SPEED) return higher(start);
  const down = height < heights[start];
  let snap = start;
  for (;;) {
    const next = down ? lower(snap) : higher(snap);
    if (next === snap) return snap;
    const here = heights[snap];
    const gap = Math.abs(here - heights[next]);
    // Not far enough toward the next snap point: stay on this one.
    if (gap === 0 || Math.abs(height - here) < COMMIT_SHARE * gap) return snap;
    // Dragged back across the start: nothing to commit.
    if (down ? height >= here : height <= here) return snap;
    snap = next;
  }
}

/** Keyboard on the handle. Enter and Space toggle between peek and split. */
export function snapForKey(snap: Snap, key: string): Snap | null {
  switch (key) {
    case "ArrowDown":
      return lower(snap);
    case "ArrowUp":
      return higher(snap);
    case "Enter":
    case " ":
      return snap === "peek" ? "split" : "peek";
    case "Escape":
      return snap === "peek" ? null : lower(snap);
    default:
      return null;
  }
}
