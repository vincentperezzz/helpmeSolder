"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { getCatalogPart } from "@/lib/catalog";
import type { Guide, PowerSource } from "@/lib/catalog/types";
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
  kind: "board" | "module" | "passive" | "power";
};

type Wire = {
  id: string;
  color: string;
  d: string;
  label: string;
  mid: { x: number; y: number };
  from: { x: number; y: number };
  to: { x: number; y: number };
};

const COLORS = [
  "#c62828",
  "#1565c0",
  "#2e7d32",
  "#ef6c00",
  "#6a1b9a",
  "#00838f",
  "#546e7a",
  "#ad1457",
];

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;

function wireColor(index: number, label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("gnd") || lower.includes("vss") || lower.includes("-")) {
    return "#212121";
  }
  if (
    lower.includes("vcc") ||
    lower.includes("vin") ||
    lower.includes("5v") ||
    lower.includes("3v") ||
    lower.includes("v+") ||
    lower.includes("+")
  ) {
    return "#c62828";
  }
  if (lower.includes("sda") || lower.includes("data") || lower.includes("scl") || lower.includes("clk")) {
    return "#6a1b9a";
  }
  return COLORS[index % COLORS.length];
}

function pinLabel(catalogId: string, pinId: string): string {
  const catalog = getCatalogPart(catalogId);
  const pin = catalog?.pins.find((entry) => entry.id === pinId);
  return pin?.label || pinId;
}

function layoutParts(guide: Guide): PlacedPart[] {
  const boards: PlacedPart[] = [];
  const passives: PlacedPart[] = [];
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
      kind: catalog.kind,
    };
    if (catalog.kind === "board") boards.push(placed);
    else if (catalog.kind === "passive") passives.push(placed);
    else modules.push(placed);
  }

  let boardY = 120;
  boards.forEach((part, index) => {
    part.x = 200;
    part.y = boardY;
    boardY += index === 0 ? 340 : 260;
  });

  let passiveY = 120;
  passives.forEach((part) => {
    const breadboard = part.catalogId.includes("breadboard");
    part.x = breadboard ? 520 : 560;
    part.y = passiveY;
    passiveY += breadboard ? 220 : 110;
  });

  let moduleY = 120;
  modules.forEach((part) => {
    const tall =
      part.tag?.includes("lcd") ||
      part.tag?.includes("ili9341") ||
      part.tag?.includes("ssd1306");
    part.x = passives.length > 0 ? 900 : 620;
    part.y = moduleY;
    moduleY += tall ? 280 : 190;
  });

  return [...boards, ...passives, ...modules];
}

function routedPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  index: number,
): { d: string; mid: { x: number; y: number } } {
  const lane = ((index % 5) - 2) * 18;
  const midX = from.x + (to.x - from.x) * 0.5 + lane;
  const midY = (from.y + to.y) / 2 + lane * 0.35;
  return {
    d: `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`,
    mid: { x: midX, y: midY },
  };
}

function BreadboardVisual({
  instanceId,
  name,
}: {
  instanceId: string;
  name: string;
}) {
  const cols = 30;
  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];
  const hole = (cx: number, cy: number, key: string) => (
    <circle key={key} cx={cx} cy={cy} r={1.6} fill="#9aa3a8" />
  );

  return (
    <div data-instance={instanceId} className="select-none" style={{ width: 340 }}>
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-ink-soft">
        {name}
      </p>
      <svg viewBox="0 0 340 180" width={340} height={180} aria-label={name}>
        <rect x="0" y="0" width="340" height="180" rx="6" fill="#f7f2e8" stroke="#c2b59a" />
        <rect x="8" y="10" width="324" height="14" fill="#f0d9d5" />
        <rect x="8" y="156" width="324" height="14" fill="#d7e4f0" />
        <text x="14" y="20" fontSize="9" fill="#c62828" fontFamily="monospace">
          +
        </text>
        <text x="14" y="166" fontSize="9" fill="#1565c0" fontFamily="monospace">
          −
        </text>
        {Array.from({ length: cols }, (_, col) => {
          const x = 28 + col * 10;
          return (
            <g key={`rail-${col}`}>
              {hole(x, 17, `p-${col}`)}
              {hole(x, 163, `g-${col}`)}
            </g>
          );
        })}
        {rowsTop.map((row, rowIndex) =>
          Array.from({ length: cols }, (_, col) =>
            hole(28 + col * 10, 40 + rowIndex * 10, `${row}${col}`),
          ),
        )}
        {rowsBot.map((row, rowIndex) =>
          Array.from({ length: cols }, (_, col) =>
            hole(28 + col * 10, 108 + rowIndex * 10, `${row}${col}`),
          ),
        )}
        <line x1="20" y1="90" x2="320" y2="90" stroke="#d7cbb3" strokeWidth="2" />
      </svg>
    </div>
  );
}

function PowerSourceVisual({
  source,
  x,
  y,
}: {
  source: PowerSource;
  x: number;
  y: number;
}) {
  if (source === "usb_wall") {
    return (
      <div
        data-instance="power-source"
        className="absolute"
        style={{ left: x, top: y, width: 150 }}
      >
        <svg viewBox="0 0 150 110" width={150} height={110} aria-label="USB wall power">
          <rect x="18" y="8" width="70" height="52" rx="6" fill="#eceff1" stroke="#546e7a" />
          <rect x="28" y="18" width="18" height="10" rx="1" fill="#90a4ae" />
          <rect x="52" y="18" width="18" height="10" rx="1" fill="#90a4ae" />
          <text x="28" y="48" fontSize="9" fill="#37474f" fontFamily="monospace">
            USB WALL
          </text>
          <path d="M88 34 H118" stroke="#212121" strokeWidth="3" />
          <rect x="118" y="26" width="22" height="16" rx="2" fill="#37474f" />
          <text x="18" y="78" fontSize="10" fill="#546e7a" fontFamily="monospace">
            5V USB adapter
          </text>
          <text x="18" y="94" fontSize="9" fill="#78909c" fontFamily="monospace">
            → board USB / VIN
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      data-instance="power-source"
      className="absolute"
      style={{ left: x, top: y, width: 150 }}
    >
      <svg viewBox="0 0 150 110" width={150} height={110} aria-label="Battery power">
        <rect x="16" y="12" width="92" height="48" rx="6" fill="#fff8e1" stroke="#8d6e63" />
        <rect x="24" y="20" width="22" height="32" rx="3" fill="#ffecb3" stroke="#8d6e63" />
        <rect x="50" y="20" width="22" height="32" rx="3" fill="#ffecb3" stroke="#8d6e63" />
        <rect x="76" y="20" width="22" height="32" rx="3" fill="#ffecb3" stroke="#8d6e63" />
        <rect x="108" y="28" width="8" height="16" rx="1" fill="#6d4c41" />
        <text x="24" y="78" fontSize="10" fill="#5d4037" fontFamily="monospace">
          BATTERY PACK
        </text>
        <text x="24" y="94" fontSize="9" fill="#8d6e63" fontFamily="monospace">
          + → VIN   − → GND
        </text>
      </svg>
    </div>
  );
}

function SkeletonPart({
  instanceId,
  name,
  catalogId,
}: {
  instanceId: string;
  name: string;
  catalogId: string;
}) {
  const catalog = getCatalogPart(catalogId);
  return (
    <div
      data-instance={instanceId}
      className="rounded-md border border-line bg-paper-deep px-3 py-2"
      style={{ minWidth: 140 }}
    >
      <p className="text-xs font-semibold text-ink">{name}</p>
      <p className="font-mono text-[10px] text-mute">skeleton fallback</p>
      <ul className="mt-2 space-y-1">
        {catalog?.pins.slice(0, 8).map((pin) => (
          <li key={pin.id} className="font-mono text-[10px] text-ink-soft">
            {pin.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WokwiDiagram({ guide }: WokwiDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [wires, setWires] = useState<Wire[]>([]);
  const [canvas, setCanvas] = useState({ width: 1100, height: 560 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const fittedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );
  const placed = useMemo(() => layoutParts(guide), [guide]);

  useEffect(() => {
    fittedRef.current = false;
  }, [guide.id]);

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

    let cancelled = false;
    const measure = () => {
      const host = hostRef.current;
      if (!host || cancelled) return;

      const anchors = new Map<string, { x: number; y: number }>();
      let maxRight = 900;
      let maxBottom = 520;

      for (const part of placed) {
        const node = host.querySelector(
          `[data-instance="${part.instanceId}"]`,
        ) as (HTMLElement & { pinInfo?: PinInfo[] | (() => PinInfo[]) }) | null;
        if (!node) continue;

        const offsetX = part.x;
        const offsetY = part.y;
        const width = Math.max(node.offsetWidth, 120);
        const height = Math.max(node.offsetHeight, 80);
        maxRight = Math.max(maxRight, offsetX + width + 120);
        maxBottom = Math.max(maxBottom, offsetY + height + 100);

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
            const breadboard = part.catalogId.includes("breadboard");
            anchors.set(`${part.instanceId}:${pin.id}`, {
              x: offsetX + (breadboard ? 20 + (index % 7) * 44 : index % 2 === 0 ? 0 : width),
              y:
                offsetY +
                (breadboard
                  ? 28 + Math.floor(index / 7) * 28
                  : 28 + Math.floor(index / 2) * 16),
            });
          });
        }
      }

      if (guide.power_source) {
        const board = placed.find((part) => part.kind === "board");
        const powerOrigin = { x: 90, y: 70 };
        const boardTarget = board
          ? { x: board.x + 40, y: board.y + 20 }
          : { x: 220, y: 140 };
        anchors.set("power-source:OUT", powerOrigin);
        anchors.set("power-source:BOARD", boardTarget);
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

        const fromPart = guide.parts.find(
          (part) => part.instanceId === connection.from.instanceId,
        );
        const toPart = guide.parts.find(
          (part) => part.instanceId === connection.to.instanceId,
        );
        const fromName = fromPart
          ? pinLabel(fromPart.catalogId, connection.from.pinId)
          : connection.from.pinId;
        const toName = toPart
          ? pinLabel(toPart.catalogId, connection.to.pinId)
          : connection.to.pinId;
        const label = connection.note || `${fromName} → ${toName}`;
        const route = routedPath(from, to, index);
        maxRight = Math.max(maxRight, from.x + 40, to.x + 40, route.mid.x + 80);
        maxBottom = Math.max(maxBottom, from.y + 40, to.y + 40, route.mid.y + 40);
        nextWires.push({
          id: connection.id,
          color: wireColor(index, label),
          d: route.d,
          label,
          mid: route.mid,
          from,
          to,
        });
      });

      if (guide.power_source) {
        const from = anchors.get("power-source:OUT");
        const to = anchors.get("power-source:BOARD");
        if (from && to) {
          const label =
            guide.power_source === "battery"
              ? "Battery +/− → VIN/GND"
              : "USB wall → USB/VIN";
          const route = routedPath(from, to, 0);
          nextWires.unshift({
            id: "power-feed",
            color: guide.power_source === "battery" ? "#c62828" : "#37474f",
            d: route.d,
            label,
            mid: route.mid,
            from,
            to,
          });
        }
      }

      setCanvas({
        width: Math.ceil(maxRight + 40),
        height: Math.ceil(maxBottom + 40),
      });
      setWires(nextWires);

      const viewport = viewportRef.current;
      if (viewport && !fittedRef.current) {
        const nextWidth = Math.ceil(maxRight + 40);
        const nextHeight = Math.ceil(maxBottom + 40);
        const fit = Math.min(
          (viewport.clientWidth - 24) / nextWidth,
          (viewport.clientHeight - 24) / nextHeight,
          1,
        );
        fittedRef.current = true;
        setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
        setPan({ x: 12, y: 12 });
      }
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    const timer = window.setTimeout(measure, 120);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [ready, placed, guide.connections, guide.power_source, guide.parts]);

  const clampZoom = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }, []);

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((current) => clampZoom(current + delta));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setPan({
      x: dragRef.current.panX + dx,
      y: dragRef.current.panY + dy,
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (guide.parts.length === 0) {
    return (
      <div className="diagram-shell px-5 py-8 text-sm text-ink-soft">
        Add parts to render the wiring diagram.
      </div>
    );
  }

  return (
    <div className="diagram-shell bg-[#f4f7f5]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/80 px-3 py-2">
        <p className="font-mono text-[11px] text-mute">
          Zoom {Math.round(zoom * 100)}% · drag to pan · ctrl/⌘+wheel zoom
        </p>
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
            onClick={() => {
              fittedRef.current = false;
              const viewport = viewportRef.current;
              if (!viewport) {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                return;
              }
              const fit = Math.min(
                (viewport.clientWidth - 24) / canvas.width,
                (viewport.clientHeight - 24) / canvas.height,
                1,
              );
              fittedRef.current = true;
              setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
              setPan({ x: 12, y: 12 });
            }}
            aria-label="Reset zoom"
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
        </div>
      </div>

      {!guide.power_source ? (
        <div className="border-b border-warn-line bg-warn-bg px-3 py-2 text-xs text-warn-ink">
          Power source not set. Ask the user: battery pack or USB wall adapter?
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className="diagram-viewport cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={hostRef}
          className="relative origin-top-left"
          style={{
            width: canvas.width,
            height: canvas.height,
            minHeight: 420,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {guide.power_source ? (
            <PowerSourceVisual source={guide.power_source} x={24} y={24} />
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
                <rect
                  x={wire.mid.x - Math.min(70, wire.label.length * 3.2)}
                  y={wire.mid.y - 10}
                  width={Math.min(140, wire.label.length * 6.4 + 12)}
                  height={18}
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
                  fontSize="10"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fill="#1a242b"
                >
                  {wire.label}
                </text>
              </g>
            ))}
          </svg>

          {placed.map((part) => {
            const catalog = getCatalogPart(part.catalogId);
            const isBreadboard = part.catalogId.includes("breadboard");
            const useWokwi = ready && hasWokwiVisual(catalog) && part.tag;
            return (
              <div
                key={part.instanceId}
                className="absolute z-10"
                style={{ left: part.x, top: part.y }}
              >
                {isBreadboard ? (
                  <BreadboardVisual instanceId={part.instanceId} name={part.name} />
                ) : useWokwi ? (
                  createElement(part.tag as string, {
                    ...part.attrs,
                    "data-instance": part.instanceId,
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
        Visuals from Wokwi Elements (MIT) + custom breadboard/power. Diagram only — not a
        simulator.
        {guide.power_source
          ? ` Power diagram: ${guide.power_source === "battery" ? "battery pack" : "USB wall"}.`
          : ""}
      </p>
    </div>
  );
}
