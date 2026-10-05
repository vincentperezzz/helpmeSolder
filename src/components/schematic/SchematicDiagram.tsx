"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { getCatalogPart } from "@/lib/catalog";
import type { Guide } from "@/lib/catalog/types";
import { explainNet, explainSymbol, symbolMeaning, symbolName } from "@/lib/schematic/explain";
import { layoutSchematic } from "@/lib/schematic/layout";
import { isBreadboardCatalogId } from "@/lib/schematic/nets";
import type { SchematicLayout, SchematicNet, SchematicPart, SymbolKind } from "@/lib/schematic/types";
import { partOpacity, wireVisual } from "@/components/wokwi/focus";
import { GroundFlag, PowerFlag, SchematicSymbol, getSymbolSpec } from "./symbols";

export type SchematicDiagramProps = {
  guide: Guide;
  focusedWireIds?: string[] | null;
  hideUnfocused?: boolean;
  hoveredWireId?: string | null;
  onHoverWire?: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  enlarged?: boolean;
  onEnlargedChange?: (value: boolean) => void;
  className?: string;
  hoveredPartId?: string | null;
  onHoverPart?: (id: string | null) => void;
  focusedPartIds?: string[] | null;
};

const GROUND_COLOR = "#2c3a42";
const POWER_COLOR = "#b65c2e";
const FONT = "var(--font-mono), ui-monospace, monospace";
const NO_HOVER = "\u0000other";

function signalColor(kinds: string[]): string {
  if (kinds.includes("i2c")) return "#1f5a56";
  if (kinds.includes("analog")) return "#8f4520";
  return "#4f5f67";
}

function netColor(net: SchematicNet | undefined, kinds: string[]): string {
  if (net?.kind === "ground") return GROUND_COLOR;
  if (net?.kind === "power") return POWER_COLOR;
  return signalColor(kinds);
}

function pinKey(instanceId: string, pinId: string): string {
  return `${instanceId}\u0000${pinId}`;
}

function describeEnd(layout: SchematicLayout, net: SchematicNet, self: SchematicPart): string[] {
  if (net.kind !== "signal") return [net.label];
  const out: string[] = [];
  for (const ref of net.pins) {
    if (ref.instanceId === self.instanceId) continue;
    const other = layout.parts.find((part) => part.instanceId === ref.instanceId);
    const pin = other?.pins.find((candidate) => candidate.pinId === ref.pinId);
    if (!other || !pin) continue;
    out.push(other.symbol === "block" ? `${other.name} ${pin.label}` : `${symbolName(other.symbol)} ${other.refDes}`);
  }
  return out;
}

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function partLabel(layout: SchematicLayout, part: SchematicPart, netOfPin: Map<string, SchematicNet>): string {
  const ends: string[] = [];
  for (const pin of part.pins) {
    const net = netOfPin.get(pinKey(part.instanceId, pin.pinId));
    if (net) ends.push(...describeEnd(layout, net, part));
  }
  const unique = [...new Set(ends)].slice(0, 4);
  const base = part.symbol === "block" ? part.name : `${symbolName(part.symbol)} ${part.refDes}`;
  const value = part.valueText && part.symbol !== "block" ? `, ${part.valueText}` : "";
  return unique.length > 0 ? `${base}${value}, connected to ${joinWords(unique)}` : `${base}${value}`;
}

function SymbolPreview({ kind }: { kind: SymbolKind }) {
  const spec = getSymbolSpec(kind);
  return (
    <svg
      viewBox={`-3 -3 ${spec.width + 6} ${spec.height + 6}`}
      className="h-8 w-14 shrink-0 text-ink"
      aria-hidden="true"
      focusable="false"
    >
      <SchematicSymbol spec={spec} x={0} y={0} />
    </svg>
  );
}

export function SchematicDiagram({
  guide,
  focusedWireIds = null,
  hideUnfocused = false,
  hoveredWireId = null,
  onHoverWire,
  onSelectWire,
  enlarged = false,
  className,
  hoveredPartId,
  onHoverPart,
  focusedPartIds = null,
}: SchematicDiagramProps) {
  const [localPart, setLocalPart] = useState<string | null>(null);
  const layout = useMemo(() => layoutSchematic(guide), [guide]);
  const shellClass = `diagram-shell${className ? ` ${className}` : ""}`;

  const model = useMemo(() => {
    const netById = new Map(layout.nets.map((net) => [net.id, net]));
    const netOfPin = new Map<string, SchematicNet>();
    for (const net of layout.nets) for (const ref of net.pins) netOfPin.set(pinKey(ref.instanceId, ref.pinId), net);
    const netsOfConnection = new Map<string, string[]>();
    for (const net of layout.nets) {
      for (const id of net.connectionIds) netsOfConnection.set(id, [...(netsOfConnection.get(id) ?? []), net.id]);
    }
    const netKinds = new Map<string, string[]>();
    for (const part of layout.parts) {
      for (const pin of part.pins) {
        const net = netOfPin.get(pinKey(part.instanceId, pin.pinId));
        if (net) netKinds.set(net.id, [...(netKinds.get(net.id) ?? []), ...pin.kinds]);
      }
    }
    const partNets = new Map<string, SchematicNet[]>();
    for (const part of layout.parts) {
      const nets = new Map<string, SchematicNet>();
      for (const pin of part.pins) {
        const net = netOfPin.get(pinKey(part.instanceId, pin.pinId));
        if (net) nets.set(net.id, net);
      }
      partNets.set(part.instanceId, [...nets.values()]);
    }
    return { netById, netOfPin, netsOfConnection, netKinds, partNets };
  }, [layout]);

  if (guide.parts.length === 0 || layout.parts.length === 0) {
    return (
      <div className={`${shellClass} px-5 py-8 text-sm text-ink-soft`}>
        Add parts to render the schematic.
      </div>
    );
  }

  const { netById, netOfPin, netsOfConnection, netKinds, partNets } = model;
  const activePartId = hoveredPartId !== undefined ? hoveredPartId : localPart;

  const focusing = focusedWireIds != null || focusedPartIds != null;
  const focusedNets = new Set<string>();
  for (const id of focusedWireIds ?? []) for (const netId of netsOfConnection.get(id) ?? []) focusedNets.add(netId);
  for (const id of focusedPartIds ?? []) for (const net of partNets.get(id) ?? []) focusedNets.add(net.id);
  const focusedParts = new Set<string>(focusedPartIds ?? []);
  for (const netId of focusedNets) for (const ref of netById.get(netId)?.pins ?? []) focusedParts.add(ref.instanceId);
  const focusIds: string[] | null = focusing
    ? [...(focusedWireIds ?? []), ...[...focusedNets].flatMap((netId) => netById.get(netId)?.connectionIds ?? [])]
    : null;

  const hoverNets = new Set<string>();
  for (const netId of hoveredWireId ? (netsOfConnection.get(hoveredWireId) ?? []) : []) hoverNets.add(netId);
  if (activePartId) for (const net of partNets.get(activePartId) ?? []) hoverNets.add(net.id);
  const hovering = hoverNets.size > 0;
  const hoverParts = new Set<string>();
  if (activePartId) hoverParts.add(activePartId);
  for (const netId of hoverNets) for (const ref of netById.get(netId)?.pins ?? []) hoverParts.add(ref.instanceId);

  const visualFor = (netId: string, ownId: string) =>
    wireVisual(ownId, focusIds, hideUnfocused, hovering ? (hoverNets.has(netId) ? ownId : NO_HOVER) : null);

  const repForNet = (net: SchematicNet | undefined) => net?.connectionIds[0] ?? null;
  const repForPart = (part: SchematicPart) => repForNet(partNets.get(part.instanceId)?.[0]);

  const hoverWire = (id: string | null) => onHoverWire?.(id);
  const enterNet = (net: SchematicNet | undefined) => hoverWire(repForNet(net));
  const keyActivate = (event: KeyboardEvent, id: string | null) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectWire?.(id);
  };
  const setPartHover = (part: SchematicPart | null) => {
    setLocalPart(part ? part.instanceId : null);
    onHoverPart?.(part ? part.instanceId : null);
    hoverWire(part ? repForPart(part) : null);
  };

  const caption = (() => {
    const partId = activePartId ?? (hovering ? null : [...focusedParts].find((id) => id !== layout.parts[0]?.instanceId));
    const part = partId ? layout.parts.find((entry) => entry.instanceId === partId) : undefined;
    if (part) {
      const text = explainSymbol(part.symbol, part.valueText);
      return { title: part.symbol === "block" ? part.name : text.title, body: text.body };
    }
    const netId = [...hoverNets][0] ?? (focusedNets.size === 1 ? [...focusedNets][0] : undefined);
    const net = netId ? netById.get(netId) : undefined;
    if (net) return explainNet(net);
    return null;
  })();

  const kinds: SymbolKind[] = [];
  for (const part of layout.parts) if (part.symbol !== "block" && !kinds.includes(part.symbol)) kinds.push(part.symbol);
  const hasBlock = layout.parts.some((part) => part.symbol === "block");
  const hasBreadboard = guide.parts.some((entry) => isBreadboardCatalogId(entry.catalogId));

  return (
    <div className={shellClass}>
      {layout.tooComplex ? (
        <p
          role="note"
          className="m-3 border border-warn-line bg-warn-bg px-3 py-2 text-xs text-warn-ink sm:mx-5"
        >
          This circuit is big, so the schematic may look crowded. The real-parts picture is easier to follow.
        </p>
      ) : null}
      <div className="overflow-x-auto px-3 py-4 sm:px-5 sm:py-6">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Circuit schematic"
          className={`h-auto w-full ${enlarged ? "min-w-[720px]" : "min-w-[320px]"}`}
          fontFamily={FONT}
        >
          <rect
            x={0}
            y={0}
            width={layout.width}
            height={layout.height}
            fill="transparent"
            onClick={() => onSelectWire?.(null)}
          />

          {layout.wires.map((wire) => {
            const net = netById.get(wire.netId);
            const visual = visualFor(wire.netId, wire.connectionId);
            if (!visual.visible) return null;
            const points = wire.points.map((point) => `${point.x},${point.y}`).join(" ");
            const text = net ? explainNet(net) : null;
            return (
              <g
                key={`${wire.netId}-${wire.connectionId}-${points}`}
                opacity={visual.opacity}
                onMouseEnter={() => enterNet(net)}
                onMouseLeave={() => hoverWire(null)}
                onClick={() => onSelectWire?.(wire.connectionId)}
                data-wire={wire.connectionId}
              >
                {text ? <title>{`${text.title}. ${text.body}`}</title> : null}
                <polyline
                  points={points}
                  fill="none"
                  stroke={netColor(net, netKinds.get(wire.netId) ?? [])}
                  strokeWidth={visual.emphasized ? 3 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  className="schematic-hit"
                  points={points}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  pointerEvents="stroke"
                />
              </g>
            );
          })}

          {layout.rails.map((rail) => {
            const net = netById.get(rail.netId);
            const visual = visualFor(rail.netId, rail.connectionIds[0] ?? rail.id);
            if (!visual.visible) return null;
            const color = rail.kind === "ground" ? GROUND_COLOR : POWER_COLOR;
            const Flag = rail.kind === "ground" ? GroundFlag : PowerFlag;
            const text = net ? explainNet(net) : null;
            return (
              <g
                key={rail.id}
                opacity={visual.opacity}
                style={{ color }}
                onMouseEnter={() => enterNet(net)}
                onMouseLeave={() => hoverWire(null)}
                onClick={() => onSelectWire?.(repForNet(net))}
                data-rail={rail.id}
              >
                {text ? <title>{`${text.title}. ${text.body}`}</title> : null}
                <path
                  d={`M${rail.stubFrom.x} ${rail.stubFrom.y}L${rail.at.x} ${rail.at.y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={visual.emphasized ? 2.6 : 1.8}
                  strokeLinecap="round"
                />
                <Flag x={rail.at.x} y={rail.at.y} label={rail.label} highlighted={visual.emphasized} />
                <rect
                  className="schematic-hit"
                  x={rail.at.x - 16}
                  y={rail.at.y - (rail.kind === "power" ? 26 : 0)}
                  width={32}
                  height={rail.kind === "power" ? 26 : 34}
                  fill="transparent"
                />
              </g>
            );
          })}

          {layout.parts.map((part) => {
            const catalog = getCatalogPart(part.catalogId);
            const spec = getSymbolSpec(part.symbol, catalog);
            const opacity = partOpacity(
              part.instanceId,
              focusing ? focusedParts : null,
              hovering ? hoverParts : null,
            );
            const text = explainSymbol(part.symbol, part.valueText);
            const label = partLabel(layout, part, netOfPin);
            return (
              <g
                key={part.instanceId}
                className="schematic-part"
                role="button"
                tabIndex={0}
                aria-label={label}
                opacity={opacity}
                style={{ color: "var(--ink)" }}
                onMouseEnter={() => setPartHover(part)}
                onMouseLeave={() => setPartHover(null)}
                onFocus={() => setPartHover(part)}
                onBlur={() => setPartHover(null)}
                onClick={() => onSelectWire?.(repForPart(part))}
                onKeyDown={(event) => keyActivate(event, repForPart(part))}
                data-part={part.instanceId}
              >
                <title>{`${part.symbol === "block" ? part.name : text.title}. ${text.body}`}</title>
                <rect
                  x={part.x - 4}
                  y={part.y - 14}
                  width={part.width + 8}
                  height={part.height + 30}
                  fill="transparent"
                />
                <SchematicSymbol
                  spec={spec}
                  part={catalog}
                  x={part.x}
                  y={part.y}
                  refDes={part.refDes}
                  valueText={part.valueText}
                  highlighted={activePartId === part.instanceId}
                />
                {part.pins.map((pin) =>
                  netOfPin.has(pinKey(part.instanceId, pin.pinId)) ? (
                    <circle key={pin.pinId} cx={pin.x} cy={pin.y} r={2.4} fill="currentColor" />
                  ) : null,
                )}
                <rect
                  className="schematic-focus-ring"
                  x={part.x - 6}
                  y={part.y - 16}
                  width={part.width + 12}
                  height={part.height + 34}
                  rx={4}
                  fill="none"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <p aria-live="polite" className="min-h-[3.25rem] border-t border-line px-4 py-2 text-xs text-ink-soft sm:px-5">
        {caption ? (
          <>
            <strong className="font-semibold text-ink">{caption.title}.</strong> {caption.body}
          </>
        ) : (
          "Hover, tap or tab to a part or wire to see what it does."
        )}
      </p>

      <div className="border-t border-line px-4 py-3 sm:px-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mute">Symbols in this guide</h3>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {kinds.map((kind) => (
            <li key={kind} className="flex items-center gap-3 text-xs text-ink-soft">
              <SymbolPreview kind={kind} />
              <span>
                <strong className="font-semibold text-ink">{symbolName(kind)}.</strong> {symbolMeaning(kind)}
              </span>
            </li>
          ))}
          {hasBlock ? (
            <li className="text-xs text-ink-soft">Boxes with pin names are boards and modules.</li>
          ) : null}
          {hasBreadboard ? (
            <li className="text-xs text-ink-soft">The breadboard is left out. It only joins wires together.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
