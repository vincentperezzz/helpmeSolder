import type { CatalogPart, CatalogPin } from "@/lib/catalog/types";
import type { SymbolPinSpec, SymbolSpec } from "@/lib/schematic/types";
import { GLYPHS } from "./glyphs";
import { blockTitleY } from "./spec";

export type SchematicSymbolProps = {
  spec: SymbolSpec;
  part?: CatalogPart;
  x: number;
  y: number;
  label?: string;
  valueText?: string;
  refDes?: string;
  className?: string;
  highlighted?: boolean;
};

const PIN_LABEL_INSET = 6;
const PIN_STUB = 6;

function PinLabel({ pin, anchor }: { pin: CatalogPin; anchor: SymbolPinSpec }) {
  const common = { fontSize: 10, fill: "currentColor", stroke: "none" } as const;
  if (anchor.side === "left") {
    return (
      <text {...common} x={anchor.x + PIN_LABEL_INSET} y={anchor.y + 3.5} textAnchor="start">
        {pin.label}
      </text>
    );
  }
  if (anchor.side === "right") {
    return (
      <text {...common} x={anchor.x - PIN_LABEL_INSET} y={anchor.y + 3.5} textAnchor="end">
        {pin.label}
      </text>
    );
  }
  const y = anchor.side === "top" ? anchor.y + 14 : anchor.y - 8;
  return (
    <text {...common} x={anchor.x} y={y} textAnchor="middle">
      {pin.label}
    </text>
  );
}

function PinStub({ anchor }: { anchor: SymbolPinSpec }) {
  const dx = anchor.side === "left" ? PIN_STUB : anchor.side === "right" ? -PIN_STUB : 0;
  const dy = anchor.side === "top" ? PIN_STUB : anchor.side === "bottom" ? -PIN_STUB : 0;
  return <path d={`M${anchor.x} ${anchor.y}l${dx} ${dy}`} />;
}

function BlockBody({ spec, part, label }: { spec: SymbolSpec; part?: CatalogPart; label?: string }) {
  const title = label ?? part?.name;
  return (
    <>
      <rect x={0} y={0} width={spec.width} height={spec.height} rx={3} />
      {title ? (
        <text
          x={spec.width / 2}
          y={blockTitleY(spec)}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="currentColor"
          stroke="none"
        >
          {title}
        </text>
      ) : null}
      {(part?.pins ?? []).map((pin) => {
        const anchor = spec.pins[pin.id];
        if (!anchor) return null;
        return (
          <g key={pin.id}>
            <PinStub anchor={anchor} />
            <PinLabel pin={pin} anchor={anchor} />
          </g>
        );
      })}
    </>
  );
}

export function SchematicSymbol({
  spec,
  part,
  x,
  y,
  label,
  valueText,
  refDes,
  className,
  highlighted,
}: SchematicSymbolProps) {
  const textProps = { fontSize: 10, fill: "currentColor", stroke: "none", textAnchor: "middle" } as const;
  const Glyph = spec.kind === "block" ? null : GLYPHS[spec.kind];
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={className}
      data-symbol={spec.kind}
      data-highlighted={highlighted ? "true" : undefined}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={highlighted ? 2.6 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {Glyph ? <Glyph voltageText={label} /> : <BlockBody spec={spec} part={part} label={label} />}
      </g>
      {refDes ? (
        <text {...textProps} x={spec.width / 2} y={-6} fontWeight={600}>
          {refDes}
        </text>
      ) : null}
      {valueText ? (
        <text {...textProps} x={spec.width / 2} y={spec.height + 13}>
          {valueText}
        </text>
      ) : null}
    </g>
  );
}
