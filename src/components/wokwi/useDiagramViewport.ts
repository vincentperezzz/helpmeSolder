import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clampZoom } from "./constants";
import type { CanvasSize } from "./types";

export function useDiagramViewport({
  guideId,
  canvas,
  ready,
  enlarged = false,
  onEnlargedChange,
}: {
  guideId: string;
  canvas: CanvasSize;
  ready: boolean;
  enlarged?: boolean;
  onEnlargedChange?: (enlarged: boolean) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [fullscreen, setFullscreen] = useState(false);
  const fittedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const immersive = enlarged || fullscreen;

  useEffect(() => {
    fittedRef.current = false;
  }, [guideId]);

  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFullscreen(active);
      if (active) onEnlargedChange?.(true);
      fittedRef.current = false;
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [onEnlargedChange]);

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setZoom(1);
      setPan({ x: 40, y: 40 });
      return;
    }
    const fit = Math.min(
      (viewport.clientWidth - 48) / Math.max(canvas.fitWidth ?? canvas.width, 1),
      (viewport.clientHeight - 48) / Math.max(canvas.fitHeight ?? canvas.height, 1),
      1.15,
    );
    fittedRef.current = true;
    setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
    setPan({ x: 40, y: 40 });
  }, [canvas.fitHeight, canvas.fitWidth, canvas.height, canvas.width]);

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
  }, [ready, immersive]);

  const pinchDistance = () => {
    const [a, b] = Array.from(pointersRef.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const isTouch = event.pointerType === "touch";
    if (!isTouch && event.button !== 0 && event.button !== 1) return;
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
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
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
    fittedRef,
    zoom,
    pan,
    fullscreen,
    setZoom,
    setPan,
    fitToViewport,
    toggleFullscreen,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
  };
}
