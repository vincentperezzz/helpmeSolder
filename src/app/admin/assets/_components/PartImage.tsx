"use client";

import { createElement, useState } from "react";
import { useWokwiReady } from "@/components/wokwi/useWokwiReady";

type Props = {
  name: string;
  thumbnailUrl: string | null;
  /** Standalone diagram SVG, when one exists. */
  drawingUrl: string | null;
  /** Wokwi web component drawing, when the diagram uses one. */
  wokwi: { tag: string; attrs?: Record<string, string> } | null;
  /** Plain text for a drawing we can only name (breadboard, USB adapter). */
  drawingNote: string;
  size?: "tile" | "row";
};

type View = "photo" | "diagram";

/** One card image with a small Photo / Diagram switch instead of two boxes. */
export function PartImage({ name, thumbnailUrl, drawingUrl, wokwi, drawingNote, size = "row" }: Props) {
  const [view, setView] = useState<View>("photo");
  const ready = useWokwiReady();
  const hasDiagram = Boolean(drawingUrl || wokwi);
  const box =
    size === "tile"
      ? "aspect-square"
      : "aspect-[4/3] w-44 shrink-0 sm:w-52";

  return (
    <div className="min-w-0">
      <div
        className={`flex ${box} items-center justify-center overflow-hidden rounded-md border border-line bg-paper-deep/60 p-1.5`}
      >
        {view === "photo" || !hasDiagram ? (
          thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt={`${name} thumbnail`} loading="lazy" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-medium text-copper-deep">No image</span>
          )
        ) : drawingUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={drawingUrl} alt={`${name} diagram drawing`} loading="lazy" className="h-full w-full object-contain" />
        ) : wokwi && ready ? (
          <div role="img" aria-label={`${name} diagram drawing`} className="max-h-full max-w-full [&>*]:max-h-full">
            {createElement(wokwi.tag, wokwi.attrs ?? {})}
          </div>
        ) : (
          <span className="text-xs text-mute">Loading drawing</span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div role="group" aria-label="Image shown" className="inline-flex rounded-full border border-line bg-white/70 p-0.5 text-xs">
          {(["photo", "diagram"] as const).map((v) => {
            const disabled = v === "diagram" && !hasDiagram;
            const active = view === v || (v === "photo" && !hasDiagram);
            return (
              <button
                key={v}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => setView(v)}
                className={`rounded-full px-2.5 py-1 ${
                  active ? "bg-ink text-paper" : "text-ink-soft"
                } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {v === "photo" ? "Photo" : "Diagram"}
              </button>
            );
          })}
        </div>
        {!hasDiagram ? <span className="truncate text-[11px] text-mute">{drawingNote}</span> : null}
      </div>
    </div>
  );
}
