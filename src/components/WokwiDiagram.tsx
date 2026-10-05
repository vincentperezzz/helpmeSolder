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
import type { CanvasSize } from "@/components/wokwi/types";
import { isBatteryPowerSource } from "@/lib/guides/power-source";
import { buildSolderItems, type WireItem } from "@/lib/guides/solder-plan";
import { hasWokwiVisual } from "@/lib/catalog/wokwi";
import { isBreadboardId } from "./wokwi/breadboard";
import { BreadboardVisual } from "./wokwi/BreadboardVisual";
import { LABEL_FONT, POWER_ORIGIN, clampZoom } from "./wokwi/constants";
import { buildCue } from "./wokwi/cue";
import { POWER_SOURCE_ID, attachedPartIds, partOpacity, wireVisual } from "./wokwi/focus";
import { labelLeader, labelSize } from "./wokwi/labels";
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
};

type Target = { kind: "wire" | "part"; id: string };
type TipContent = TooltipContent & { color?: string };

/** Pointer travel below this many px counts as a tap or click, not a drag. */
const TAP_SLOP = 6;

function partContent(guide: Guide, id: string): TipContent | null {
  if (id === POWER_SOURCE_ID) {
    const source = guide.power_source;
    if (!source) return null;
    if (isBatteryPowerSource(source)) {
      const asset = getBatteryAsset(source);
      return {
        title: asset.label,
        tag: "Power",
        detail: `Powers the board. ${asset.caption}.`,
      };
    }
    return {
      title: "USB wall adapter",
      tag: "Power",
      detail: "A phone charger. Its cable plugs into the board's USB port.",
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
}: WokwiDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ready = useWokwiReady();
  const [canvas, setCanvas] = useState<CanvasSize>({ width: 1400, height: 820 });
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
  } = useDiagramViewport({
    guideId: guide.id,
    refitKey: refitKey,
    canvas,
    ready,
    enlarged,
    onEnlargedChange,
  });
  const placed = useMemo(() => layoutParts(guide), [guide]);
  const cue = useMemo(() => buildCue(guide), [guide]);
  const wires = useWireMeasure({
    guide,
    placed,
    ready,
    hostRef,
    viewportRef,
    fittedRef,
    setCanvas,
    setZoom,
    setPan,
  });

  const solderItems = useMemo(() => {
    const map = new Map<string, WireItem>();
    for (const item of buildSolderItems(guide)) map.set(item.id, item);
    return map;
  }, [guide]);
  const boardInstanceId = useMemo(
    () => placed.find((part) => part.kind === "board")?.instanceId,
    [placed],
  );
  const wireById = useMemo(() => new Map(wires.map((wire) => [wire.id, wire])), [wires]);

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
    return partContent(guide, active.id);
  }, [active, wireById, solderItems, guide]);

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
    onPointerDown(event);
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    downRef.current = null;
    onPointerUp(event);
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
    const c = partContent(guide, id);
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

  return (
    <div
      ref={shellRef}
      className={`diagram-shell whiteboard-shell bg-[#eef3f0] ${fullscreen ? "is-fullscreen" : ""} ${enlarged ? "is-enlarged" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/90 px-3 py-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-xs font-semibold tracking-tight text-ink">{cue}</p>
          <p className="text-[11px] text-mute">
            Zoom {Math.round(zoom * 100)}%. Drag to move. Hold Ctrl/Cmd and scroll, or use the
            buttons, to zoom. Point at or tap a part or wire to see what it is.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setZoom((value) => clampZoom(value - 0.15))}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <span aria-hidden="true">− </span>Zoom out
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setZoom((value) => clampZoom(value + 0.15))}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <span aria-hidden="true">+ </span>Zoom in
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={fitToViewport}
            aria-label="Fit the whole picture on screen"
            title="Fit the whole picture on screen"
          >
            Fit all
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 40 });
              fittedRef.current = true;
            }}
            aria-label="Reset view to actual size"
            title="Reset view to actual size"
          >
            Reset view
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => onEnlargedChange?.(!enlarged)}
            aria-pressed={enlarged}
            aria-label={enlarged ? "Make the picture smaller and show the steps again" : "Make the picture bigger"}
            title={enlarged ? "Make the picture smaller and show the steps again" : "Make the picture bigger"}
          >
            {enlarged ? "Smaller" : "Bigger"}
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={async () => {
              onEnlargedChange?.(true);
              await toggleFullscreen();
            }}
            aria-label={fullscreen ? "Exit full screen" : "Show the picture full screen"}
            title={fullscreen ? "Exit full screen" : "Show the picture full screen"}
          >
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      {!guide.power_source ? (
        <div className="border-b border-warn-line bg-warn-bg px-3 py-2 text-xs text-warn-ink">
          Power source not set. Ask the user: 9V, 2×AA, 3×AA, 18650, or USB wall?
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className="diagram-viewport cursor-grab select-none active:cursor-grabbing [&_*]:select-none [&_*]:[-webkit-user-drag:none] [&_*]:[-webkit-touch-callout:none]"
        onDragStart={(event) => event.preventDefault()}
        tabIndex={0}
        role="group"
        aria-label="Wiring picture viewer. Arrow keys move the picture, plus and minus zoom."
        onKeyDown={onKeyDown}
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
            minWidth: 1200,
            minHeight: 720,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
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
            className="pointer-events-none absolute inset-0 z-20"
            width={canvas.width}
            height={canvas.height}
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
                        strokeLinecap="square"
                        strokeLinejoin="miter"
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
            {/* Labels last, so no wire is ever drawn over a label. */}
            {wires.map((wire) => {
              if (!wire.showLabel) return null;
              const visual = wireVisual(wire.id, focusedWireIds, hideUnfocused, highlightId);
              const size = labelSize(wire.label);
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
                    <line
                      x1={leader.from.x}
                      y1={leader.from.y}
                      x2={leader.to.x}
                      y2={leader.to.y}
                      stroke={stroke}
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <rect
                    x={wire.mid.x - size.w / 2}
                    y={wire.mid.y - size.h / 2}
                    width={size.w}
                    height={size.h}
                    rx={4}
                    fill="#f4f7f5"
                    stroke={stroke}
                    strokeWidth={visual.emphasized ? 2 : 1.2}
                  />
                  <text
                    x={wire.mid.x}
                    y={wire.mid.y + LABEL_FONT * 0.35}
                    textAnchor="middle"
                    fontSize={LABEL_FONT}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fill="#1a242b"
                  >
                    {wire.label}
                  </text>
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

      <p className="border-t border-line px-3 py-2 text-[11px] text-mute">
        This picture shows which part connects to which. It is a guide for you, not a working
        circuit, and the written checklist has the same information.
        {guide.power_source
          ? isBatteryPowerSource(guide.power_source)
            ? ` Power: ${getBatteryAsset(guide.power_source).caption}.`
            : " Power: USB wall adapter, cable plugged into the board's USB port."
          : ""}
      </p>
      {tooltip}
    </div>
  );
}
