import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { computeFit } from "./bounds";
import { clampZoom } from "./constants";
import type { CanvasSize } from "./types";

export function useDiagramViewport({
  guideId,
  refitKey = "",
  canvas,
  ready,
  enlarged = false,
  onEnlargedChange,
}: {
  guideId: string;
  /** Changes when the drawn parts or power source change, so the picture is fitted again. */
  refitKey?: string;
  canvas: CanvasSize;
  ready: boolean;
  enlarged?: boolean;
  onEnlargedChange?: (enlarged: boolean) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = useState(1);
  const [pan, setPanState] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  /** True once the user zoomed or panned by hand since the last fit: then resizes keep the view. */
  const manualRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(
    null,
  );
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const immersive = enlarged || fullscreen;

  // Manual changes (buttons, wheel, keys, drag, pinch) stop automatic refitting.
  const setZoom = useCallback((next: number | ((value: number) => number)) => {
    manualRef.current = true;
    setZoomState(next);
  }, []);
  const setPan = useCallback(
    (next: { x: number; y: number } | ((value: { x: number; y: number }) => { x: number; y: number })) => {
      manualRef.current = true;
      setPanState(next);
    },
    [],
  );

  useEffect(() => {
    manualRef.current = false;
  }, [guideId, refitKey]);

  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFullscreen(active);
      if (active) onEnlargedChange?.(true);
      manualRef.current = false;
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [onEnlargedChange]);

  /** Fit the content box into the viewport now. Returns false while the viewport has no size yet. */
  const applyFit = useCallback((): boolean => {
    const viewport = viewportRef.current;
    if (!viewport || viewport.clientWidth < 40 || viewport.clientHeight < 40) return false;
    const fit = computeFit({ width: viewport.clientWidth, height: viewport.clientHeight }, canvas);
    setZoomState(fit.zoom);
    setPanState(fit.pan);
    return true;
  }, [canvas]);

  const fitToViewport = useCallback(() => {
    manualRef.current = false;
    if (!applyFit()) {
      setZoomState(1);
      setPanState({ x: 0, y: 0 });
    }
  }, [applyFit]);

  const resetView = useCallback(() => {
    manualRef.current = true;
    setZoomState(1);
    setPanState({ x: 12, y: 12 });
  }, []);

  const zoomBy = useCallback(
    (delta: number) => setZoom((value) => clampZoom(value + delta)),
    [setZoom],
  );

  // Fit whenever the measured content changes (and nobody moved the view by hand).
  const measured = canvas.fitWidth !== undefined;
  useLayoutEffect(() => {
    if (measured && !manualRef.current) applyFit();
  }, [measured, applyFit]);

  // Refit when the pane is resized, for example by hiding the side panel or
  // resizing the window, unless the user has moved the view since the last fit.
  const applyFitRef = useRef(applyFit);
  useEffect(() => {
    applyFitRef.current = applyFit;
  }, [applyFit]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    let last = { w: viewport.clientWidth, h: viewport.clientHeight };
    const observer = new ResizeObserver(() => {
      const next = { w: viewport.clientWidth, h: viewport.clientHeight };
      if (Math.abs(next.w - last.w) < 1 && Math.abs(next.h - last.h) < 1) return;
      last = next;
      if (measured && !manualRef.current) applyFitRef.current();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [ready, measured]);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      setFullscreen((value) => !value);
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      const wantsZoom = event.ctrlKey || event.metaKey;
      // Default: let the page scroll. Only hijack the wheel when the user
      // asked for zoom (ctrl/cmd, also sent by trackpad pinch) or chose an
      // immersive mode.
      if (!wantsZoom && !immersive) return;
      event.preventDefault();
      if (wantsZoom) {
        const delta = event.deltaY > 0 ? -0.12 : 0.12;
        setZoom((current) => clampZoom(current + delta));
        return;
      }
      setPan((current) => ({
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [ready, immersive, setZoom, setPan]);

  // Root cause of the "ghost image" drag: nothing stopped the browser's own
  // press-and-drag handling (text selection, then dragging the selection or an
  // <img>/<svg>). Cancel native drag and selection anywhere inside the viewport.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const block = (event: Event) => event.preventDefault();
    viewport.addEventListener("dragstart", block, true);
    viewport.addEventListener("selectstart", block, true);
    return () => {
      viewport.removeEventListener("dragstart", block, true);
      viewport.removeEventListener("selectstart", block, true);
    };
  }, [ready]);

  const pinchDistance = () => {
    const [a, b] = Array.from(pointersRef.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const isTouch = event.pointerType === "touch";
    if (!isTouch && event.button !== 0 && event.button !== 1) return;
    // A mouse press anywhere in the viewport, on empty canvas or on a part,
    // must pan rather than start a text selection or native drag.
    if (!isTouch) {
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      dragRef.current = null;
      pinchRef.current = { dist: Math.max(pinchDistance(), 1), zoom };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    // One finger on a phone scrolls the page unless the user went immersive.
    if (isTouch && !immersive) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinchRef.current && pointersRef.current.size >= 2) {
      setZoom(clampZoom((pinchRef.current.zoom * pinchDistance()) / pinchRef.current.dist));
      return;
    }
    if (!dragRef.current) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      dragRef.current = null;
      return;
    }
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    // A click with a little jitter is not a pan: keep automatic fitting.
    if (!dragRef.current.moved && Math.hypot(dx, dy) < 4) return;
    dragRef.current.moved = true;
    setPan({
      x: dragRef.current.panX + dx,
      y: dragRef.current.panY + dy,
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = 40;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setPan((current) => ({ x: current.x + move[0], y: current.y + move[1] }));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((value) => clampZoom(value + 0.15));
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom((value) => clampZoom(value - 0.15));
    }
  };

  return {
    shellRef,
    viewportRef,
    zoom,
    pan,
    fullscreen,
    zoomBy,
    resetView,
    fitToViewport,
    toggleFullscreen,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
  };
}
