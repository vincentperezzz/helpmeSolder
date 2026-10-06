"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { BoardAssetVisual } from "@/components/BoardAssets";
import { getCatalogPart } from "@/lib/catalog";
import {
  getDiagramAsset,
  prefersDiagramAsset,
} from "@/lib/catalog/board-assets";
import { getBatteryAsset } from "@/lib/catalog/batteries";
import type { Guide } from "@/lib/catalog/types";
import type { CanvasSize, Point, Rect } from "@/components/wokwi/types";
import { isBatteryPowerSource } from "@/lib/guides/power-source";
import { buildSolderItems, type WireItem } from "@/lib/guides/solder-plan";
import { hasWokwiVisual } from "@/lib/catalog/wokwi";
import { isBreadboardId } from "./wokwi/breadboard";
import { BreadboardVisual } from "./wokwi/BreadboardVisual";
import { BADGE_R, badgeRects, badgeTextColor } from "./wokwi/badges";
import { cardText, placeCards, pointToward, stringPath, tagGeometry, TAG_HOLE_R, type CardRequest, type TagSide } from "./wokwi/cards";
import { LABEL_FONT, POWER_ORIGIN } from "./wokwi/constants";
import { buildCue } from "./wokwi/cue";
import { POWER_SOURCE_ID, attachedPartIds, partOpacity, wireVisual } from "./wokwi/focus";
import { labelLeader, labelRect } from "./wokwi/labels";
import { layoutParts } from "./wokwi/layout";
import { PowerSourceVisual } from "./wokwi/PowerSourceVisual";
import { SkeletonPart } from "./wokwi/SkeletonPart";
import {
  partTooltip,
  placeTooltip,
  tooltipLabel,
  wireTooltip,
  type TooltipContent,
} from "./wokwi/tooltip";
import { useDiagramViewport } from "./wokwi/useDiagramViewport";
import { UsbPlugShape } from "./wokwi/UsbPlugShape";
import { useWireMeasure } from "./wokwi/useWireMeasure";
import { useWokwiReady } from "./wokwi/useWokwiReady";

type WokwiDiagramProps = {
  guide: Guide;
  enlarged?: boolean;
  onEnlargedChange?: (enlarged: boolean) => void;
  /** null/undefined: every wire is drawn normally. Otherwise these wires (guide connection ids) are drawn at full strength. */
  focusedWireIds?: string[] | null;
  /** With focusedWireIds: hide the other wires instead of dimming them. */
  hideUnfocused?: boolean;
  /** Wire to highlight from outside, for example a hovered checklist row. */
  hoveredWireId?: string | null;
  onHoverWire?: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  /**
   * false: read-only embed. No toolbar, zoom, pan or full screen; the picture stays fitted
   * and only wire and part highlighting remains. Defaults to the full app viewer.
   */
  chrome?: boolean;
};

type Target = { kind: "wire" | "part"; id: string };
type TipContent = TooltipContent & { color?: string };

/** Pointer travel below this many px counts as a tap or click, not a drag. */
const TAP_SLOP = 6;

const TOOLBAR_ICONS = {
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 9h6v6H9z",
  reset: "M4 12a8 8 0 1 0 3-6.2M4 4v4h4",
  names: "M4 6h9a3 3 0 0 1 3 3v0M4 12h12M4 18h7M17 15l3 3-3 3",
  "panel-hide": "M4 5h16v14H4zM14 5v14M17 10l-2 2 2 2",
  "panel-show": "M4 5h16v14H4zM14 5v14M16 10l2 2-2 2",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  close: "M6 6l12 12M18 6L6 18",
} as const;

function ToolbarIcon({ name }: { name: keyof typeof TOOLBAR_ICONS }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block"
    >
      <path d={TOOLBAR_ICONS[name]} />
    </svg>
  );
}

function partContent(guide: Guide, id: string, embed = false): TipContent | null {
  if (id === POWER_SOURCE_ID) {
    const source = guide.power_source;
    if (!source) return null;
    if (isBatteryPowerSource(source)) {
      const asset = getBatteryAsset(source);
      return {
        title: asset.label,
        tag: "Power",
        detail: embed ? "Powers the board." : `Powers the board. ${asset.caption}.`,
      };
    }
    const bank = source === "power_bank";
    return {
      title: bank ? "USB power bank" : "USB wall adapter",
      tag: "Power",
      detail: bank
        ? "A phone power bank. Its cable plugs into the board's USB port."
        : "A phone charger. Its cable plugs into the board's USB port.",
    };
  }
  const instance = guide.parts.find((part) => part.instanceId === id);
  if (!instance) return null;
  return partTooltip(instance.label, getCatalogPart(instance.catalogId), instance.catalogId);
}

export function WokwiDiagram({
  guide,
  enlarged = false,
  onEnlargedChange,
  focusedWireIds = null,
  hideUnfocused = false,
  hoveredWireId = null,
  onHoverWire,
  onSelectWire,
  chrome = true,
}: WokwiDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ready = useWokwiReady();
  const [canvas, setCanvas] = useState<CanvasSize>({ width: 1400, height: 820 });
  const [showNames, setShowNames] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const refitKey = useMemo(
    () =>
      `${guide.power_source ?? ""}|${guide.parts
        .map((part) => `${part.instanceId}:${part.catalogId}`)
        .join(",")}|${guide.connections.length}`,
    [guide.power_source, guide.parts, guide.connections.length],
  );
  const {
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
  } = useDiagramViewport({
    guideId: guide.id,
    refitKey: refitKey,
    canvas,
    ready,
    enlarged,
  });
  const placed = useMemo(() => layoutParts(guide), [guide]);
  const cue = useMemo(() => buildCue(guide), [guide]);

  // The same order as the written "What to solder where" list; item id is the connection id.
  const solderItems = useMemo(() => {
    const map = new Map<string, WireItem>();
    for (const item of buildSolderItems(guide)) map.set(item.id, item);
    return map;
  }, [guide]);
  const numbers = useMemo(
    () => new Map([...solderItems.keys()].map((id, index) => [id, index + 1] as const)),
    [solderItems],
  );
  const scene = useWireMeasure({ guide, placed, ready, hostRef, numbers, setCanvas });
  const wires = scene.wires;
  const boardInstanceId = useMemo(
    () => placed.find((part) => part.kind === "board")?.instanceId,
    [placed],
  );
  const wireById = useMemo(() => new Map(wires.map((wire) => [wire.id, wire])), [wires]);

  useEffect(() => {
    if (chrome) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const block = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.stopImmediatePropagation();
    };
    viewport.addEventListener("wheel", block, { capture: true });
    return () => viewport.removeEventListener("wheel", block, { capture: true });
  }, [chrome, viewportRef, ready]);

  const [hover, setHover] = useState<Target | null>(null);
  const [pinned, setPinned] = useState<Target | null>(null);
  const hoverRef = useRef<Target | null>(null);
  const selectedRef = useRef<string | null>(null);
  const anchorRef = useRef({ x: 0, y: 0 });
  const tipRef = useRef<HTMLDivElement>(null);
  const downRef = useRef<{ x: number; y: number; target: Element | null } | null>(null);

  const active = pinned ?? hover;
  const highlightId = (active?.kind === "wire" ? active.id : null) ?? hoveredWireId ?? null;

  const isConnectionId = useCallback(
    (id: string) => guide.connections.some((connection) => connection.id === id),
    [guide.connections],
  );

  const focusParts = useMemo(
    () =>
      focusedWireIds ? attachedPartIds(guide.connections, focusedWireIds, boardInstanceId) : null,
    [focusedWireIds, guide.connections, boardInstanceId],
  );
  const highlightParts = useMemo(
    () =>
      highlightId ? attachedPartIds(guide.connections, [highlightId], boardInstanceId) : null,
    [highlightId, guide.connections, boardInstanceId],
  );

  // Text cards: the hovered, selected or focused wires, or every wire when
  // "Wire names" is on. Placed in clear space inside the content bounds.
  const cards = useMemo(() => {
    if (!scene.bounds) return [];
    const requests: CardRequest[] = [];
    const add = (id: string | null | undefined, relax: boolean) => {
      if (!id || requests.some((request) => request.id === id)) return;
      const wire = wireById.get(id);
      if (!wire || wire.number === undefined || !wire.badge) return;
      if (!wireVisual(id, focusedWireIds, hideUnfocused, highlightId).visible) return;
      requests.push({ id, relax });
    };
    add(highlightId, true);
    add(selected, true);
    if (showNames) {
      [...wires]
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
        .forEach((wire) => add(wire.id, false));
    } else if (focusedWireIds && focusedWireIds.length <= 4) {
      focusedWireIds.forEach((id) => add(id, true));
    }
    if (requests.length === 0) return [];
    const pills = wires.flatMap((wire) => (wire.showLabel ? [labelRect(wire.mid, wire.label)] : []));
    return placeCards(requests, {
      wires,
      partRects: scene.partRects,
      bounds: scene.bounds,
      fixedRects: [...pills, ...badgeRects(wires)],
    });
  }, [scene, wires, wireById, highlightId, selected, showNames, focusedWireIds, hideUnfocused]);

  const content = useMemo((): TipContent | null => {
    if (!active) return null;
    if (active.kind === "wire") {
      const wire = wireById.get(active.id);
      if (!wire) return null;
      return {
        ...wireTooltip(solderItems.get(wire.id), wire.title ?? wire.label, wire.color),
        color: wire.color,
      };
    }
    return partContent(guide, active.id, !chrome);
  }, [active, wireById, solderItems, guide, chrome]);

  const positionTip = useCallback(() => {
    const tip = tipRef.current;
    if (!tip) return;
    const { left, top } = placeTooltip(
      anchorRef.current,
      { w: tip.offsetWidth, h: tip.offsetHeight },
      { w: window.innerWidth, h: window.innerHeight },
    );
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }, []);

  useLayoutEffect(() => {
    positionTip();
  }, [content, positionTip]);

  const setHovered = useCallback(
    (next: Target | null) => {
      const prev = hoverRef.current;
      if (prev?.kind === next?.kind && prev?.id === next?.id) return;
      hoverRef.current = next;
      setHover(next);
      const wasWire = prev?.kind === "wire" && isConnectionId(prev.id);
      const isWire = next?.kind === "wire" && isConnectionId(next.id);
      if (isWire && next) onHoverWire?.(next.id);
      else if (wasWire) onHoverWire?.(null);
    },
    [isConnectionId, onHoverWire],
  );

  const select = useCallback(
    (id: string | null) => {
      if (selectedRef.current === id) return;
      selectedRef.current = id;
      setSelected(id);
      onSelectWire?.(id);
    },
    [onSelectWire],
  );

  // Escape closes the tooltip and clears the selection.
  useEffect(() => {
    if (!hover && !pinned) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinned(null);
      setHovered(null);
      select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hover, pinned, setHovered, select]);

  /** Data and accessibility attributes for a part or wire. `label` null: decorative (label pills). */
  const tipAttrs = (target: Target, label: string | null) =>
    label !== null
      ? { "data-tip-kind": target.kind, "data-tip-id": target.id, tabIndex: 0, "aria-label": label }
      : { "data-tip-kind": target.kind, "data-tip-id": target.id, "aria-hidden": true as const };

  // One set of delegated handlers on the picture: the elements only carry data
  // attributes, so hover, focus and keys work for every part, wire and label.
  const tipTarget = (node: EventTarget | null): Target | null => {
    const el = (node as Element | null)?.closest?.("[data-tip-kind]") as HTMLElement | null;
    const kind = el?.dataset.tipKind as Target["kind"] | undefined;
    const id = el?.dataset.tipId;
    return kind && id ? { kind, id } : null;
  };
  const handleWorldMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    anchorRef.current = { x: event.clientX, y: event.clientY };
    setHovered(tipTarget(event.target));
    positionTip();
  };
  const handleWorldFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    const target = tipTarget(event.target);
    const node = event.target as HTMLElement | SVGElement;
    if (!target || !node.matches(":focus-visible")) return;
    const box = node.getBoundingClientRect();
    anchorRef.current = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    setHovered(target);
  };
  const handleWorldKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = tipTarget(event.target);
    if (target?.kind !== "wire" || !isConnectionId(target.id)) return;
    event.preventDefault();
    event.stopPropagation();
    select(selectedRef.current === target.id ? null : target.id);
  };

  // Clicks and taps are resolved here, not on the elements: the viewport
  // captures the pointer for panning, which retargets pointerup and click.
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    downRef.current = { x: event.clientX, y: event.clientY, target: event.target as Element };
    if (event.pointerType !== "touch") setHovered(null);
    if (chrome) onPointerDown(event);
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    downRef.current = null;
    if (chrome) onPointerUp(event);
    if (!down || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > TAP_SLOP) return;
    const el = down.target?.closest?.("[data-tip-kind]") as HTMLElement | null;
    const kind = el?.dataset.tipKind as Target["kind"] | undefined;
    const id = el?.dataset.tipId;
    if (!kind || !id) {
      setPinned(null);
      select(null);
      return;
    }
    if (event.pointerType !== "mouse") {
      anchorRef.current = { x: event.clientX, y: event.clientY };
      setPinned((prev) => (prev?.kind === kind && prev.id === id ? null : { kind, id }));
    }
    if (kind === "wire" && isConnectionId(id)) {
      select(selectedRef.current === id ? null : id);
    } else {
      select(null);
    }
  };

  if (guide.parts.length === 0) {
    return (
      <div className="diagram-shell px-5 py-8 text-sm text-ink-soft">
        Add parts to render the wiring diagram.
      </div>
    );
  }

  const partLabel = (id: string) => {
    const c = partContent(guide, id, !chrome);
    return c ? tooltipLabel(c) : id;
  };

  const tooltip =
    content && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="pointer-events-none max-w-[17rem] border border-line-strong bg-paper px-3 py-2 text-xs text-ink shadow-lg"
            style={{ position: "fixed", left: 0, top: 0, zIndex: 80 }}
          >
            <p className="flex items-start gap-2 font-semibold leading-snug">
              {content.color ? (
                <span
                  aria-hidden="true"
                  className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-line-strong"
                  style={{ background: content.color }}
                />
              ) : null}
              <span>{content.title}</span>
            </p>
            {content.tag ? (
              <p className="mt-1 inline-block border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-mute">
                {content.tag}
              </p>
            ) : null}
            {content.detail ? (
              <p className="mt-1 leading-snug text-ink-soft">{content.detail}</p>
            ) : null}
          </div>,
          (fullscreen ? document.fullscreenElement : null) ?? document.body,
        )
      : null;

  const offsetX = canvas.offsetX ?? 0;
  const offsetY = canvas.offsetY ?? 0;

  return (
    <div
      ref={shellRef}
      className={`diagram-shell whiteboard-shell flex h-full min-h-0 w-full min-w-0 flex-col bg-[#eef3f0] ${fullscreen ? "is-fullscreen" : ""} ${enlarged ? "is-enlarged" : ""}`}
    >
      {chrome ? (
      <div className="diagram-toolbar flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-paper/90 px-3 py-1.5">
        <p
          className="diagram-cue min-w-0 flex-1 basis-40 truncate text-xs font-semibold tracking-tight text-ink"
          title={cue}
        >
          {cue}
        </p>
        <p id="diagram-help" className="sr-only">
          Drag to move. Hold Ctrl or Cmd and scroll, or use the zoom buttons, to zoom. Point at
          or tap a part or wire to see what it is. Numbers on the wires match the numbered
          checklist.
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <span
            className="min-w-10 px-1 text-center text-[11px] text-mute tabular-nums"
            title="Zoom level"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => zoomBy(-0.15)}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => zoomBy(0.15)}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <span aria-hidden="true">+</span>
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={fitToViewport}
            aria-label="Fit the whole picture on screen"
            title="Fit the whole picture on screen"
          >
            <span className="diagram-btn-icon" aria-hidden="true"><ToolbarIcon name="fit" /></span>
            <span className="diagram-btn-label">Fit all</span>
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={resetView}
            aria-label="Reset view to actual size"
            title="Reset view to actual size"
          >
            <span className="diagram-btn-icon" aria-hidden="true"><ToolbarIcon name="reset" /></span>
            <span className="diagram-btn-label">Reset view</span>
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setShowNames((value) => !value)}
            aria-pressed={showNames}
            aria-label="Wire names"
            title={
              showNames
                ? "Hide the text names of the wires"
                : "Show the text name of every wire (point at a wire to see just one)"
            }
          >
            <span className="diagram-btn-icon" aria-hidden="true"><ToolbarIcon name="names" /></span>
            <span className="diagram-btn-label">Wire names</span>
          </button>
          {onEnlargedChange ? (
            <button
              type="button"
              className="diagram-zoom-btn diagram-panel-btn"
              onClick={() => onEnlargedChange(!enlarged)}
              aria-pressed={enlarged}
              aria-label={enlarged ? "Show panel" : "Hide panel"}
              title={
                enlarged
                  ? "Show the parts list and steps panel again"
                  : "Hide the parts list and steps panel"
              }
            >
              <span className="diagram-btn-icon" aria-hidden="true"><ToolbarIcon name={enlarged ? "panel-show" : "panel-hide"} /></span>
              <span className="diagram-btn-label">{enlarged ? "Show panel" : "Hide panel"}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? "Exit full screen" : "Show the picture full screen"}
            title={fullscreen ? "Exit full screen" : "Show the picture full screen"}
          >
            <span className="diagram-btn-icon" aria-hidden="true"><ToolbarIcon name={fullscreen ? "close" : "expand"} /></span>
            <span className="diagram-btn-label">{fullscreen ? "Exit full screen" : "Full screen"}</span>
          </button>
        </div>
      </div>
      ) : null}

      {!guide.power_source ? (
        <div className="border-b border-warn-line bg-warn-bg px-3 py-2 text-xs text-warn-ink">
          Power source not set. Ask the user which power source to use (USB, AA cells, 9V, coin cell, LiPo...).
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={`diagram-viewport min-h-0 flex-1 select-none ${chrome ? "cursor-grab active:cursor-grabbing" : "cursor-default"} [&_*]:select-none [&_*]:[-webkit-user-drag:none] [&_*]:[-webkit-touch-callout:none]`}
        onDragStart={(event) => event.preventDefault()}
        tabIndex={chrome ? 0 : undefined}
        role="group"
        aria-label={
          chrome
            ? "Wiring picture viewer. Arrow keys move the picture, plus and minus zoom."
            : "Wiring picture"
        }
        aria-describedby={chrome ? "diagram-help" : undefined}
        onKeyDown={chrome ? onKeyDown : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(event) => {
          downRef.current = null;
          onPointerUp(event);
        }}
      >
        <div
          ref={hostRef}
          className="diagram-world relative origin-top-left select-none"
          role="group"
          onPointerMove={handleWorldMove}
          onPointerLeave={() => setHovered(null)}
          onFocus={handleWorldFocus}
          onBlur={() => setHovered(null)}
          onKeyDown={handleWorldKey}
          aria-label={`Wiring picture for ${guide.title}. The written checklist and steps on this page list the same connections. Tab through the parts and wires to hear what each one is.`}
          style={{
            width: canvas.width,
            height: canvas.height,
            flex: "none",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Zero-size layer shifted so nothing starts left of or above the safe margin. */}
          <div
            className="diagram-layer absolute left-0 top-0"
            style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
          >
          {guide.power_source ? (
            <PowerSourceVisual
              source={guide.power_source}
              x={POWER_ORIGIN.x}
              y={POWER_ORIGIN.y}
              hover={{
                ...tipAttrs(
                  { kind: "part", id: POWER_SOURCE_ID },
                  partLabel(POWER_SOURCE_ID),
                ),
                className: "diagram-fade diagram-focusable",
                style: { opacity: partOpacity(POWER_SOURCE_ID, focusParts, highlightParts) },
              }}
            />
          ) : null}

          <svg
            className="pointer-events-none absolute left-0 top-0 z-20"
            width={Math.max(1, scene.bounds?.maxX ?? canvas.width)}
            height={Math.max(1, scene.bounds?.maxY ?? canvas.height)}
            style={{ overflow: "visible" }}
          >
            {wires.map((wire) => {
              const visual = wireVisual(wire.id, focusedWireIds, hideUnfocused, highlightId);
              const text = tooltipLabel(
                wireTooltip(solderItems.get(wire.id), wire.title ?? wire.label, wire.color),
              );
              const props = tipAttrs(
                { kind: "wire", id: wire.id },
                visual.visible ? text : null,
              );
              const groupProps = visual.visible
                ? props
                : { ...props, tabIndex: -1, "aria-hidden": true };
              return (
                <g
                  key={wire.id}
                  {...groupProps}
                  role="img"
                  className="diagram-fade diagram-wire"
                  style={{
                    opacity: visual.opacity,
                    visibility: visual.visible ? "visible" : "hidden",
                  }}
                >
                  {visual.emphasized ? (
                    <path
                      d={wire.d}
                      fill="none"
                      stroke={wire.plugs ? "#546e7a" : wire.color}
                      strokeOpacity={0.28}
                      strokeWidth={wire.plugs ? 17 : 11}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {wire.plugs ? (
                    <>
                      <path
                        d={wire.d}
                        fill="none"
                        stroke="#37474f"
                        strokeWidth={9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={wire.d}
                        fill="none"
                        stroke="#b0bec5"
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {wire.plugs.map((plug, i) => (
                        <UsbPlugShape key={i} plug={plug} />
                      ))}
                    </>
                  ) : (
                    <>
                      <path
                        d={wire.d}
                        fill="none"
                        stroke={wire.color}
                        strokeWidth={visual.emphasized ? 3.8 : 2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        className="motion-trace"
                        style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
                      />
                      <circle cx={wire.from.x} cy={wire.from.y} r={visual.emphasized ? 4.2 : 3.2} fill={wire.color} />
                      <circle cx={wire.to.x} cy={wire.to.y} r={visual.emphasized ? 4.2 : 3.2} fill={wire.color} />
                    </>
                  )}
                  {/* Wide invisible target so thin wires are easy to hit. */}
                  <path
                    d={wire.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: visual.visible ? "stroke" : "none" }}
                  />
                </g>
              );
            })}
            {/* Short pills for the power wires only, drawn above the wires. */}
            {wires.map((wire) => {
              if (!wire.showLabel) return null;
              const visual = wireVisual(wire.id, focusedWireIds, hideUnfocused, highlightId);
              const rect = labelRect(wire.mid, wire.label);
              const leader = labelLeader(wire.points, wire.mid, wire.label);
              const stroke = wire.plugs ? "#37474f" : wire.color;
              return (
                <g
                  key={`${wire.id}-label`}
                  {...tipAttrs({ kind: "wire", id: wire.id }, null)}
                  className="diagram-fade"
                  style={{
                    opacity: visual.opacity,
                    visibility: visual.visible ? "visible" : "hidden",
                    pointerEvents: visual.visible ? "all" : "none",
                  }}
                >
                  {leader ? (
                    <WireTag
                      rect={rect}
                      side={leader.to.x < wire.mid.x ? "left" : "right"}
                      color={stroke}
                      band={stroke}
                      anchor={leader.to}
                      text={cardText(wire.label)}
                      emphasized={visual.emphasized}
                    />
                  ) : (
                    <WireTag
                      rect={rect}
                      side="left"
                      color={stroke}
                      band={stroke}
                      text={cardText(wire.label)}
                      emphasized={visual.emphasized}
                    />
                  )}
                </g>
              );
            })}

            {/* Numbered badges: the number is the wire's line in the written checklist. */}
            {wires.map((wire) => {
              if (!wire.badge || wire.number === undefined) return null;
              const visual = wireVisual(wire.id, focusedWireIds, hideUnfocused, highlightId);
              const radius = visual.emphasized ? BADGE_R + 1.5 : BADGE_R;
              // Keep the number readable when the picture is zoomed out.
              const grow = Math.min(2.6, Math.max(1, 0.75 / zoom));
              return (
                <g
                  key={`${wire.id}-badge`}
                  {...tipAttrs({ kind: "wire", id: wire.id }, null)}
                  className="diagram-fade"
                  transform={`translate(${wire.badge.x} ${wire.badge.y}) scale(${grow}) translate(${-wire.badge.x} ${-wire.badge.y})`}
                  style={{
                    opacity: visual.opacity,
                    visibility: visual.visible ? "visible" : "hidden",
                    pointerEvents: visual.visible ? "all" : "none",
                  }}
                >
                  <circle
                    cx={wire.badge.x}
                    cy={wire.badge.y}
                    r={radius}
                    fill="#ffffff"
                    stroke="rgba(26,36,43,0.35)"
                    strokeWidth={0.75}
                  />
                  <circle cx={wire.badge.x} cy={wire.badge.y} r={radius - 1.75} fill={wire.color} />
                  <text
                    x={wire.badge.x}
                    y={wire.badge.y + 3.6}
                    textAnchor="middle"
                    fontSize={wire.number > 9 ? 10 : 11.5}
                    fontWeight={700}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fill={badgeTextColor(wire.color)}
                  >
                    {wire.number}
                  </text>
                </g>
              );
            })}

            {/* Text cards for hovered, selected or focused wires (or all, with Wire names). */}
            {cards.map((card) => {
              const wire = wireById.get(card.id);
              if (!wire) return null;
              const visual = wireVisual(wire.id, focusedWireIds, hideUnfocused, highlightId);
              return (
                <g
                  key={`${wire.id}-card`}
                  aria-hidden="true"
                  className="diagram-fade"
                  style={{
                    opacity: visual.opacity,
                    visibility: visual.visible ? "visible" : "hidden",
                    pointerEvents: "none",
                  }}
                >
                  <WireTag
                    rect={card.rect}
                    side={card.side}
                    color={wire.color}
                    band={wire.color}
                    anchor={pointToward(card.anchor, card.hole, wire.badge ? BADGE_R + 1 : 0)}
                    text={card.text}
                    emphasized={visual.emphasized}
                  />
                </g>
              );
            })}
          </svg>

          {placed.map((part) => {
            const catalog = getCatalogPart(part.catalogId);
            const breadboard = isBreadboardId(part.catalogId);
            const hasWokwi = Boolean(hasWokwiVisual(catalog) && part.tag);
            const diagramAsset = getDiagramAsset(part.catalogId);
            const useAsset =
              Boolean(diagramAsset) &&
              prefersDiagramAsset(part.catalogId, hasWokwi);
            const useWokwi = ready && hasWokwi && !useAsset;
            return (
              <div
                key={part.instanceId}
                {...tipAttrs({ kind: "part", id: part.instanceId }, partLabel(part.instanceId))}
                className="diagram-fade diagram-focusable absolute z-10"
                style={{
                  left: part.x,
                  top: part.y,
                  ...(part.transform ? { transform: part.transform, transformOrigin: "0 0" } : {}),
                  opacity: partOpacity(part.instanceId, focusParts, highlightParts),
                }}
              >
                {breadboard ? (
                  <BreadboardVisual instanceId={part.instanceId} name={part.name} />
                ) : useAsset && diagramAsset ? (
                  <BoardAssetVisual
                    instanceId={part.instanceId}
                    name={part.name}
                    asset={diagramAsset}
                  />
                ) : useWokwi ? (
                  createElement(part.tag as string, {
                    ...part.attrs,
                    "data-instance": part.instanceId,
                    draggable: false,
                    style: { display: "inline-block" },
                  })
                ) : (
                  <SkeletonPart
                    instanceId={part.instanceId}
                    name={part.name}
                    catalogId={part.catalogId}
                  />
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {chrome ? (
        <p className="shrink-0 border-t border-line px-3 py-1.5 text-[11px] text-mute">
          This picture shows which part connects to which. It is a guide for you, not a working
          circuit, and the written checklist has the same information.
          {guide.power_source
            ? isBatteryPowerSource(guide.power_source)
              ? ` Power: ${getBatteryAsset(guide.power_source).caption}.`
              : guide.power_source === "power_bank"
                ? " Power: USB power bank, cable plugged into the board's USB port."
                : " Power: USB wall adapter, cable plugged into the board's USB port."
            : ""}
        </p>
      ) : null}
      {tooltip}
    </div>
  );
}

/**
 * A luggage-style tag for a wire name: pointed end with a punched hole, a
 * band in the wire's colour, and a dotted string to `anchor` (a round dot
 * where it meets the wire). Decorative; the parent group owns pointer events.
 */
function WireTag({
  rect,
  side,
  color,
  band,
  anchor,
  text,
  emphasized,
}: {
  rect: Rect;
  side: TagSide;
  color: string;
  band: string;
  anchor?: Point;
  text: string;
  emphasized: boolean;
}) {
  const geo = tagGeometry(rect, side);
  return (
    <g>
      {anchor ? (
        <>
          <path
            d={stringPath(geo.hole, anchor)}
            fill="none"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray="0.1 4"
          />
          <circle cx={anchor.x} cy={anchor.y} r={3} fill={color} stroke="#fffdf7" strokeWidth={1.2} />
        </>
      ) : null}
      <g className="diagram-tag">
        <path d={geo.body} fill="#fbf6e9" stroke={color} strokeWidth={emphasized ? 1.8 : 1.1} strokeLinejoin="round" />
        <path d={geo.cap} fill={band} />
        <circle cx={geo.hole.x} cy={geo.hole.y} r={TAG_HOLE_R} fill="#fffdf7" stroke="rgba(26,36,43,0.55)" strokeWidth={0.8} />
        <text
          x={geo.textX}
          y={rect.y + rect.h / 2 + LABEL_FONT * 0.35}
          textAnchor="middle"
          fontSize={LABEL_FONT}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill="#1a242b"
        >
          {text}
        </text>
      </g>
    </g>
  );
}
