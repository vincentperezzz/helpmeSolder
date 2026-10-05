import { clampZoom } from "./constants";
import { labelRect } from "./labels";
import type { Bounds, CanvasSize, Point, Rect, Wire } from "./types";

/** Nothing is drawn closer than this to the left, top, right or bottom edge of the canvas. */
export const SAFE_MARGIN = 24;
/** Half-width of a drawn wire plus its end dot, so strokes are never clipped at the edge. */
export const WIRE_PAD = 5;
/** A USB plug is wider than a hookup wire. */
export const PLUG_PAD = 14;
export const FIT_PAD = 8;
export const MAX_FIT_ZOOM = 1.15;

export function rectBounds(rect: Rect): Bounds {
  return { minX: rect.x, minY: rect.y, maxX: rect.x + rect.w, maxY: rect.y + rect.h };
}

/** Grow `bounds` to hold `rect`. Pass null to start. */
export function includeRect(bounds: Bounds | null, rect: Rect): Bounds {
  if (!bounds) return rectBounds(rect);
  return {
    minX: Math.min(bounds.minX, rect.x),
    minY: Math.min(bounds.minY, rect.y),
    maxX: Math.max(bounds.maxX, rect.x + rect.w),
    maxY: Math.max(bounds.maxY, rect.y + rect.h),
  };
}

export function includePoint(bounds: Bounds | null, point: Point, pad = 0): Bounds {
  return includeRect(bounds, {
    x: point.x - pad,
    y: point.y - pad,
    w: pad * 2,
    h: pad * 2,
  });
}

/** Bounds of a box and a set of points (each padded). Null when nothing is given. */
export function computeContentBounds(input: {
  rects?: Rect[];
  points?: Point[];
  pointPad?: number;
}): Bounds | null {
  let bounds: Bounds | null = null;
  for (const rect of input.rects ?? []) bounds = includeRect(bounds, rect);
  for (const point of input.points ?? []) bounds = includePoint(bounds, point, input.pointPad ?? 0);
  return bounds;
}

/**
 * Bounds of the whole drawing: every part box, wire point, plug, badge and
 * pill label, on all four sides. This is what the canvas is sized from.
 */
export function sceneBounds(input: {
  wires: Wire[];
  partRects: Rect[];
  extraRects?: Rect[];
  badgeRadius?: number;
}): Bounds | null {
  let bounds = computeContentBounds({ rects: [...input.partRects, ...(input.extraRects ?? [])] });
  for (const wire of input.wires) {
    const pad = wire.plugs ? PLUG_PAD : WIRE_PAD;
    for (const point of wire.points) bounds = includePoint(bounds, point, pad);
    if (wire.showLabel) bounds = includeRect(bounds, labelRect(wire.mid, wire.label));
    if (wire.badge) {
      bounds = includePoint(bounds, wire.badge, (input.badgeRadius ?? 10) + 2);
    }
  }
  return bounds;
}

/**
 * Canvas for content at `bounds`: the drawing layer is shifted so the content
 * starts exactly `margin` px from the left and top, and the canvas ends
 * `margin` px past the right and bottom edges. Works for negative bounds.
 */
export function worldFromBounds(
  bounds: Bounds,
  margin = SAFE_MARGIN,
): Required<Pick<CanvasSize, "width" | "height" | "offsetX" | "offsetY">> {
  return {
    offsetX: margin - bounds.minX,
    offsetY: margin - bounds.minY,
    width: Math.ceil(bounds.maxX - bounds.minX + margin * 2),
    height: Math.ceil(bounds.maxY - bounds.minY + margin * 2),
  };
}

export function canvasFromBounds(bounds: Bounds, margin = SAFE_MARGIN): CanvasSize {
  const world = worldFromBounds(bounds, margin);
  return {
    ...world,
    fitLeft: 0,
    fitTop: 0,
    fitWidth: world.width,
    fitHeight: world.height,
  };
}

export function rectInside(rect: Rect, bounds: Bounds, tol = 0.01): boolean {
  return (
    rect.x >= bounds.minX - tol &&
    rect.y >= bounds.minY - tol &&
    rect.x + rect.w <= bounds.maxX + tol &&
    rect.y + rect.h <= bounds.maxY + tol
  );
}

/** Move `rect` the shortest way so it lies inside `bounds`. A rect larger than the bounds is pinned to the top-left edge. */
export function clampRectInto(rect: Rect, bounds: Bounds): Rect {
  const maxX = bounds.maxX - rect.w;
  const maxY = bounds.maxY - rect.h;
  return {
    ...rect,
    x: Math.max(bounds.minX, Math.min(rect.x, maxX)),
    y: Math.max(bounds.minY, Math.min(rect.y, maxY)),
  };
}

/** Zoom and pan that fit the canvas's content box into a viewport of `view` px, centred. */
export function computeFit(
  view: { width: number; height: number },
  canvas: CanvasSize,
): { zoom: number; pan: Point } {
  const fitW = Math.max(canvas.fitWidth ?? canvas.width, 1);
  const fitH = Math.max(canvas.fitHeight ?? canvas.height, 1);
  const left = canvas.fitLeft ?? 0;
  const top = canvas.fitTop ?? 0;
  const raw = Math.min(
    (view.width - FIT_PAD * 2) / fitW,
    (view.height - FIT_PAD * 2) / fitH,
    MAX_FIT_ZOOM,
  );
  const zoom = clampZoom(Number.isFinite(raw) && raw > 0 ? raw : 1);
  return {
    zoom,
    pan: {
      x: (view.width - fitW * zoom) / 2 - left * zoom,
      y: (view.height - fitH * zoom) / 2 - top * zoom,
    },
  };
}
