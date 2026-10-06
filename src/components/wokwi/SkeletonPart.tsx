"use client";

import { useMemo } from "react";
import { getCatalogPart } from "@/lib/catalog";
import { partCategory, resolvePartPhoto, type PartCategory } from "@/lib/catalog/part-media";
import {
  GP_LABEL_FONT,
  GP_PAD_R,
  genericPinLayout,
  type GenericPad,
} from "./generic-layout";
import type { PinInfo } from "./types";

/** Simple generic drawing for a part type. Never prints ids. */
export function PartGlyph({
  category,
  className,
}: {
  category: PartCategory;
  className?: string;
}) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let body;
  switch (category) {
    case "Board":
      body = (
        <>
          <rect x="10" y="14" width="28" height="20" rx="2" {...stroke} />
          <rect x="19" y="20" width="10" height="8" {...stroke} />
          <path
            d="M14 10v4M20 10v4M26 10v4M32 10v4M14 34v4M20 34v4M26 34v4M32 34v4"
            {...stroke}
          />
        </>
      );
      break;
    case "Sensor":
      body = (
        <>
          <circle cx="24" cy="24" r="4" {...stroke} />
          <path
            d="M16 16a11 11 0 0 0 0 16M32 16a11 11 0 0 1 0 16M11 11a18 18 0 0 0 0 26M37 11a18 18 0 0 1 0 26"
            {...stroke}
          />
        </>
      );
      break;
    case "Display":
      body = (
        <>
          <rect x="8" y="12" width="32" height="22" rx="2" {...stroke} />
          <path d="M14 20h14M14 26h20M18 38h12" {...stroke} />
        </>
      );
      break;
    case "Output":
      body = (
        <>
          <path d="M18 36h12M20 40h8" {...stroke} />
          <path
            d="M16 30a10 10 0 1 1 16 0c-2 2-2 4-2 6H18c0-2 0-4-2-6Z"
            {...stroke}
          />
          <path d="M24 4v3M9 12l2 2M39 12l-2 2" {...stroke} />
        </>
      );
      break;
    case "Input":
      body = (
        <>
          <rect x="9" y="22" width="30" height="14" rx="3" {...stroke} />
          <path d="M16 22v-6h16v6" {...stroke} />
          <circle cx="24" cy="29" r="2" {...stroke} />
        </>
      );
      break;
    case "Power":
      body = (
        <>
          <rect x="10" y="16" width="24" height="16" rx="2" {...stroke} />
          <path d="M34 22h4v4h-4M17 24h6M20 21v6" {...stroke} />
        </>
      );
      break;
    default:
      body = (
        <>
          <path d="M4 24h10M34 24h10" {...stroke} />
          <rect x="14" y="18" width="20" height="12" rx="2" {...stroke} />
        </>
      );
  }
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
}

/** Calm pad colours per pin kind: power red, ground grey, buses and signals distinct. */
const PAD_FILL: Record<GenericPad["kind"], string> = {
  power: "#c62828",
  ground: "#3a464d",
  i2c: "#00838f",
  spi: "#6a1b9a",
  uart: "#ef6c00",
  analog: "#2e7d32",
  digital: "#546e7a",
  other: "#8a979d",
};

/**
 * Generic drawing for a part with no Wokwi element or board picture: a card
 * with the part's illustration, name and category, and one labelled pad per
 * catalog pin. The root exposes `pinInfo` (pad centres) so wires attach exactly.
 */
export function SkeletonPart({
  instanceId,
  name,
  catalogId,
}: {
  instanceId: string;
  name: string;
  catalogId: string;
}) {
  const catalog = getCatalogPart(catalogId);
  const category = partCategory(catalog);
  const layout = useMemo(() => genericPinLayout(catalog), [catalog]);
  const photo = resolvePartPhoto(catalog?.photoHint);
  const { width, height, image, pads, oneSide } = layout;

  const pinInfo = useMemo<PinInfo[]>(
    () => pads.map((pad) => ({ name: pad.id, x: pad.x, y: pad.y, signals: [], exit: pad.exit })),
    [pads],
  );
  const setRef = (node: (HTMLDivElement & { pinInfo?: PinInfo[] }) | null) => {
    if (node) node.pinInfo = pinInfo;
  };

  const textTop = oneSide ? 6 : image.y + image.h + 6;
  return (
    <div
      ref={setRef}
      data-instance={instanceId}
      role="group"
      aria-label={`${name}, ${pads.length} ${pads.length === 1 ? "pin" : "pins"}`}
      className="relative select-none"
      style={{ width, height }}
    >
      <div
        className="absolute inset-0 rounded-lg border border-line-strong bg-paper-deep shadow-sm"
        aria-hidden="true"
      />
      <div
        className="absolute flex items-center justify-center overflow-hidden rounded-md bg-paper text-mute"
        style={{ left: image.x, top: image.y, width: image.w, height: image.h }}
        aria-hidden="true"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" draggable={false} className="max-h-full max-w-full object-contain" />
        ) : (
          <PartGlyph category={category} className="h-full max-h-12 w-12" />
        )}
      </div>
      <div className="absolute left-2.5 right-2.5 flex items-center gap-1.5" style={{ top: textTop }}>
        <span className="min-w-0 truncate text-[11px] font-semibold leading-4 text-ink" title={name}>
          {name}
        </span>
      </div>
      <span
        className="absolute rounded-full border border-line bg-paper px-1.5 text-[9px] font-medium leading-[14px] text-mute"
        style={{ left: 10, top: textTop + 17 }}
        aria-hidden="true"
      >
        {category}
      </span>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        aria-hidden="true"
      >
        {pads.map((pad) => {
          const left = pad.side === "left";
          return (
            <g key={pad.id}>
              <title>{pad.label}</title>
              <circle
                cx={pad.x}
                cy={pad.y}
                r={GP_PAD_R}
                fill={PAD_FILL[pad.kind]}
                stroke="var(--paper)"
                strokeWidth={1.25}
              />
              <text
                x={left ? pad.x + GP_PAD_R + 5 : pad.x - GP_PAD_R - 5}
                y={pad.y}
                dy="0.35em"
                textAnchor={left ? "start" : "end"}
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fontSize={GP_LABEL_FONT}
                fill="var(--ink-soft)"
              >
                {pad.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
