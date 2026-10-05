"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { CloseIcon } from "./icons";
import {
  SNAPS,
  TAP_SLOP,
  dragHeight,
  drawerHeights,
  higher,
  pickSnap,
  snapForKey,
  type DrawerHeights,
  type Snap,
} from "./drawer";
import { TAB_LABELS, TAB_IDS } from "./model";

type DrawerHeadProps = {
  /** The drawer element whose height follows the finger. */
  panelRef: RefObject<HTMLElement | null>;
  snap: Snap;
  onSnap: (snap: Snap) => void;
};

const SETTLE_MS = 260;

/**
 * Phone only (CSS hides it elsewhere): the top of the drawer. A centred handle,
 * draggable as a whole. While a finger is down the drawer height is written
 * straight to the element (no React renders); on release it animates to the
 * chosen snap point and the inline height is dropped so CSS owns it again.
 */
export function DrawerHead({ panelRef, snap, onSnap }: DrawerHeadProps) {
  const drag = useRef<{
    id: number;
    y: number;
    startHeight: number;
    startSnap: Snap;
    heights: DrawerHeights;
    last: { y: number; t: number };
    velocity: number;
    moved: boolean;
  } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const measure = useCallback((): DrawerHeights | null => {
    const panel = panelRef.current;
    const body = panel?.parentElement;
    if (!panel || !body) return null;
    const style = getComputedStyle(body);
    const gap = parseFloat(style.rowGap) || 0;
    const inner = body.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return drawerHeights(window.innerHeight, inner - gap);
  }, [panelRef]);

  const settle = useCallback(
    (target: Snap, heights: DrawerHeights) => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.removeAttribute("data-dragging");
      panel.style.height = `${heights[target]}px`;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        panel.style.removeProperty("height");
      }, SETTLE_MS);
      onSnap(target);
    },
    [panelRef, onSnap],
  );

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const panel = panelRef.current;
    const heights = measure();
    if (!panel || !heights) return;
    window.clearTimeout(timer.current);
    drag.current = {
      id: event.pointerId,
      y: event.clientY,
      startHeight: panel.offsetHeight,
      startSnap: snap,
      heights,
      last: { y: event.clientY, t: event.timeStamp },
      velocity: 0,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const panel = panelRef.current;
    if (!d || d.id !== event.pointerId || !panel) return;
    const dy = event.clientY - d.y;
    if (!d.moved && Math.abs(dy) < TAP_SLOP) return;
    if (!d.moved) panel.setAttribute("data-dragging", "true");
    d.moved = true;
    const dt = event.timeStamp - d.last.t;
    if (dt > 0) {
      // Smoothed so one jittery sample does not read as a flick.
      d.velocity = 0.6 * ((event.clientY - d.last.y) / dt) + 0.4 * d.velocity;
      d.last = { y: event.clientY, t: event.timeStamp };
    }
    panel.style.height = `${dragHeight(d.startHeight, dy, d.heights)}px`;
  }

  function end(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const panel = panelRef.current;
    if (!panel) return;
    if (!d.moved) {
      // A tap on the peek bar opens it.
      if (!cancelled && d.startSnap === "peek") settle(higher("peek"), d.heights);
      return;
    }
    const target = cancelled
      ? d.startSnap
      : pickSnap({
          start: d.startSnap,
          height: panel.offsetHeight,
          velocity: d.velocity,
          heights: d.heights,
        });
    settle(target, d.heights);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = snapForKey(snap, event.key);
    if (!next || next === snap) return;
    event.preventDefault();
    event.stopPropagation();
    onSnap(next);
  }

  const peek = snap === "peek";
  return (
    <div
      className="ga-sheet-head"
      data-print-hide="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => end(event, false)}
      onPointerCancel={(event) => end(event, true)}
    >
      <div
        className="ga-sheet-handle-zone"
        role="separator"
        aria-orientation="horizontal"
        aria-label={peek ? "Drag up to show the panel" : "Drag down to hide the panel"}
        aria-valuemin={0}
        aria-valuemax={SNAPS.length - 1}
        aria-valuenow={SNAPS.indexOf(snap)}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <span aria-hidden className="ga-sheet-handle" />
      </div>
      {peek ? (
        <p className="ga-sheet-hint" aria-hidden>
          {TAB_IDS.map((id) => TAB_LABELS[id]).join(" · ")}
        </p>
      ) : (
        <button type="button" className="ga-sheet-close" onClick={() => onSnap("peek")}>
          <CloseIcon size={18} />
          <span className="ml-1.5">Hide</span>
        </button>
      )}
    </div>
  );
}
