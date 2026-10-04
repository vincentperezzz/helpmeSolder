"use client";

import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getCatalogPart } from "@/lib/catalog";
import type { Guide } from "@/lib/catalog/types";
import { hasWokwiVisual, wokwiAttrs } from "@/lib/catalog/wokwi";

type WokwiDiagramProps = {
  guide: Guide;
};

type PinInfo = { name: string; x: number; y: number };

type PlacedPart = {
  instanceId: string;
  catalogId: string;
  tag?: string;
  attrs: Record<string, string>;
  x: number;
  y: number;
  name: string;
};

type Wire = {
  id: string;
  color: string;
  d: string;
};

const COLORS = ["#ef6c00", "#00897b", "#6a1b9a", "#1565c0", "#c62828", "#546e7a"];

function layoutParts(guide: Guide): PlacedPart[] {
  const boards: PlacedPart[] = [];
  const modules: PlacedPart[] = [];

  for (const part of guide.parts) {
    const catalog = getCatalogPart(part.catalogId);
    if (!catalog) continue;
    const placed: PlacedPart = {
      instanceId: part.instanceId,
      catalogId: part.catalogId,
      tag: catalog.wokwi?.tag,
      attrs: wokwiAttrs(catalog),
      x: 0,
      y: 0,
      name: part.label || catalog.name,
    };
    if (catalog.kind === "board") boards.push(placed);
    else modules.push(placed);
  }

  let y = 24;
  boards.forEach((part, index) => {
    part.x = 24;
    part.y = y;
    y += index === 0 ? 320 : 240;
  });

  let moduleY = 24;
  modules.forEach((part) => {
    const tall =
      part.tag?.includes("lcd") ||
      part.tag?.includes("ili9341") ||
      part.tag?.includes("ssd1306");
    part.x = 420;
    part.y = moduleY;
    moduleY += tall ? 260 : 180;
  });

  return [...boards, ...modules];
}

function wirePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

export function WokwiDiagram({ guide }: WokwiDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [wires, setWires] = useState<Wire[]>([]);
  const [canvas, setCanvas] = useState({ width: 760, height: 460 });
  const placed = useMemo(() => layoutParts(guide), [guide]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await import("@wokwi/elements");
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !hostRef.current) return;

    const frame = requestAnimationFrame(() => {
      const host = hostRef.current;
      if (!host) return;

      const anchors = new Map<string, { x: number; y: number }>();
      let maxRight = 760;
      let maxBottom = 460;

      for (const part of placed) {
        const node = host.querySelector(
          `[data-instance="${part.instanceId}"]`,
        ) as (HTMLElement & { pinInfo?: PinInfo[] | (() => PinInfo[]) }) | null;
        if (!node) continue;

        const offsetX = part.x;
        const offsetY = part.y;
        const width = Math.max(node.offsetWidth, 120);
        const height = Math.max(node.offsetHeight, 80);
        maxRight = Math.max(maxRight, offsetX + width + 64);
        maxBottom = Math.max(maxBottom, offsetY + height + 64);

        const raw = typeof node.pinInfo === "function" ? node.pinInfo() : node.pinInfo;
        if (Array.isArray(raw) && raw.length > 0) {
          for (const pin of raw) {
            anchors.set(`${part.instanceId}:${pin.name}`, {
              x: offsetX + pin.x,
              y: offsetY + pin.y,
            });
          }
        } else {
          const catalog = getCatalogPart(part.catalogId);
          catalog?.pins.forEach((pin, index) => {
            anchors.set(`${part.instanceId}:${pin.id}`, {
              x: offsetX + (index % 2 === 0 ? 0 : width),
              y: offsetY + 28 + Math.floor(index / 2) * 16,
            });
          });
        }
      }

      const nextWires: Wire[] = [];
      guide.connections.forEach((connection, index) => {
        const from = anchors.get(
          `${connection.from.instanceId}:${connection.from.pinId}`,
        );
        const to = anchors.get(
          `${connection.to.instanceId}:${connection.to.pinId}`,
        );
        if (!from || !to) return;
        nextWires.push({
          id: connection.id,
          color: COLORS[index % COLORS.length],
          d: wirePath(from, to),
        });
      });

      setCanvas({ width: maxRight, height: maxBottom });
      setWires(nextWires);
    });

    return () => cancelAnimationFrame(frame);
  }, [ready, placed, guide.connections]);

  if (guide.parts.length === 0) {
    return (
      <div className="diagram-shell px-5 py-8 text-sm text-ink-soft">
        Add parts to render the wiring diagram.
      </div>
    );
  }

  return (
    <div className="diagram-shell overflow-auto bg-[#f4f7f5] p-3 sm:p-4">
      <div
        ref={hostRef}
        className="relative"
        style={{ width: canvas.width, height: canvas.height, minHeight: 380 }}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-10"
          width={canvas.width}
          height={canvas.height}
          aria-hidden="true"
        >
          {wires.map((wire) => (
            <path
              key={wire.id}
              d={wire.d}
              fill="none"
              stroke={wire.color}
              strokeWidth={2.4}
              strokeLinecap="round"
              className="motion-trace"
              style={{ strokeDasharray: 240, strokeDashoffset: 240 }}
            />
          ))}
        </svg>

        {placed.map((part) => {
          const catalog = getCatalogPart(part.catalogId);
          const useWokwi = ready && hasWokwiVisual(catalog) && part.tag;
          return (
            <div
              key={part.instanceId}
              className="absolute z-0"
              style={{ left: part.x, top: part.y }}
            >
              {useWokwi ? (
                createElement(part.tag as string, {
                  ...part.attrs,
                  "data-instance": part.instanceId,
                })
              ) : (
                <div
                  data-instance={part.instanceId}
                  className="rounded-md border border-line bg-paper-deep px-3 py-2"
                  style={{ minWidth: 140 }}
                >
                  <p className="text-xs font-semibold text-ink">{part.name}</p>
                  <p className="font-mono text-[10px] text-mute">
                    skeleton fallback
                  </p>
                  <ul className="mt-2 space-y-1">
                    {catalog?.pins.slice(0, 8).map((pin) => (
                      <li
                        key={pin.id}
                        className="font-mono text-[10px] text-ink-soft"
                      >
                        {pin.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-mute">
        Visuals from Wokwi Elements (MIT). Diagram only — not a simulator.
      </p>
    </div>
  );
}
