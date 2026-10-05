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
import { isBatteryPowerSource } from "@/lib/guides/power-source";
import { hasWokwiVisual } from "@/lib/catalog/wokwi";
import { isBreadboardId } from "./wokwi/breadboard";
import { BreadboardVisual } from "./wokwi/BreadboardVisual";
import { POWER_ORIGIN, clampZoom } from "./wokwi/constants";
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
  const [canvas, setCanvas] = useState({ width: 1400, height: 820 });
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
  } = useDiagramViewport({ guideId: guide.id, canvas, ready, onEnlargedChange });
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
          <p className="font-mono text-[11px] text-mute">
            Whiteboard · Zoom {Math.round(zoom * 100)}% · drag / scroll to pan · ctrl/⌘+wheel zoom
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setZoom((value) => clampZoom(value - 0.15))}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={fitToViewport}
            aria-label="Fit diagram"
          >
            Fit
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setZoom((value) => clampZoom(value + 0.15))}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 40 });
              fittedRef.current = true;
            }}
            aria-label="Reset view"
          >
            100%
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => onEnlargedChange?.(!enlarged)}
            aria-label={enlarged ? "Show prep and steps again" : "Expand diagram and hide prep"}
          >
            {enlarged ? "Side" : "Expand"}
          </button>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={async () => {
              onEnlargedChange?.(true);
              await toggleFullscreen();
            }}
            aria-label={fullscreen ? "Exit fullscreen whiteboard" : "Open fullscreen whiteboard"}
          >
            {fullscreen ? "Exit" : "Full"}
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={hostRef}
          className="diagram-world relative origin-top-left"
          style={{
            width: canvas.width,
            height: canvas.height,
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
                      rx={3}
                      fill="#f4f7f5"
                      stroke={wire.color}
                      strokeWidth={1}
                      opacity={0.96}
                    />
                    <text
                      x={wire.mid.x}
                      y={wire.mid.y + 3}
                      textAnchor="middle"
                      fontSize="9"
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
        Freeform wiring whiteboard — drag like Wokwi, Full for immersion. Diagram only, not a
        simulator.
        {guide.power_source
          ? isBatteryPowerSource(guide.power_source)
            ? ` Power: ${getBatteryAsset(guide.power_source).caption}.`
            : " Power: USB wall to USB/VIN."
          : ""}
      </p>
    </div>
  );
}
