"use client";

import { createElement, useMemo, useRef, useState } from "react";
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
import { hasWokwiVisual } from "@/lib/catalog/wokwi";
import { isBreadboardId } from "./wokwi/breadboard";
import { BreadboardVisual } from "./wokwi/BreadboardVisual";
import { LABEL_FONT, POWER_ORIGIN, clampZoom } from "./wokwi/constants";
import { buildCue } from "./wokwi/cue";
import { labelSize } from "./wokwi/labels";
import { layoutParts } from "./wokwi/layout";
import { PowerSourceVisual } from "./wokwi/PowerSourceVisual";
import { SkeletonPart } from "./wokwi/SkeletonPart";
import { useDiagramViewport } from "./wokwi/useDiagramViewport";
import { useWireMeasure } from "./wokwi/useWireMeasure";
import { useWokwiReady } from "./wokwi/useWokwiReady";

type WokwiDiagramProps = {
  guide: Guide;
  enlarged?: boolean;
  onEnlargedChange?: (enlarged: boolean) => void;
};

export function WokwiDiagram({
  guide,
  enlarged = false,
  onEnlargedChange,
}: WokwiDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ready = useWokwiReady();
  const [canvas, setCanvas] = useState<CanvasSize>({ width: 1400, height: 820 });
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
  } = useDiagramViewport({ guideId: guide.id, canvas, ready, enlarged, onEnlargedChange });
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

  if (guide.parts.length === 0) {
    return (
      <div className="diagram-shell px-5 py-8 text-sm text-ink-soft">
        Add parts to render the wiring diagram.
      </div>
    );
  }

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
            buttons, to zoom.
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
        className="diagram-viewport cursor-grab active:cursor-grabbing"
        tabIndex={0}
        role="group"
        aria-label="Wiring picture viewer. Arrow keys move the picture, plus and minus zoom."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={hostRef}
          className="diagram-world relative origin-top-left"
          role="img"
          aria-label={`Wiring picture for ${guide.title}. The written checklist and steps on this page list the same connections.`}
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
            />
          ) : null}

          <svg
            className="pointer-events-none absolute inset-0 z-20"
            width={canvas.width}
            height={canvas.height}
            aria-hidden="true"
          >
            {wires.map((wire) => (
              <g key={wire.id}>
                <path
                  d={wire.d}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth={2.8}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  pathLength={1}
                  className="motion-trace"
                  style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
                />
                <circle cx={wire.from.x} cy={wire.from.y} r={3.2} fill={wire.color} />
                <circle cx={wire.to.x} cy={wire.to.y} r={3.2} fill={wire.color} />
                {wire.showLabel ? (
                  <>
                    <rect
                      x={wire.mid.x - labelSize(wire.label).w / 2}
                      y={wire.mid.y - labelSize(wire.label).h / 2}
                      width={labelSize(wire.label).w}
                      height={labelSize(wire.label).h}
                      rx={4}
                      fill="#f4f7f5"
                      stroke={wire.color}
                      strokeWidth={1}
                      opacity={0.96}
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
                  </>
                ) : null}
              </g>
            ))}
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
                className="absolute z-10"
                style={{ left: part.x, top: part.y }}
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
            : " Power: USB wall to USB/VIN."
          : ""}
      </p>
    </div>
  );
}
