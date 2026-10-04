import type { Guide } from "@/lib/catalog/types";
import { resolvePhotoPath } from "@/lib/catalog/photos";
import { layoutGuideDiagram, wirePath } from "@/lib/diagram/layout";

type WiringDiagramProps = {
  guide: Guide;
};

function pinFill(kinds: string[]): string {
  if (kinds.includes("ground")) return "#2c3a42";
  if (kinds.includes("power")) return "#b65c2e";
  if (kinds.includes("i2c")) return "#1f5a56";
  if (kinds.includes("analog")) return "#8f4520";
  return "#4f5f67";
}

export function WiringDiagram({ guide }: WiringDiagramProps) {
  if (guide.parts.length === 0) {
    return (
      <div className="diagram-shell px-5 py-8 text-sm text-ink-soft">
        Add parts to render the wiring diagram.
      </div>
    );
  }

  const layout = layoutGuideDiagram(guide);

  return (
    <div className="diagram-shell overflow-x-auto px-3 py-4 sm:px-5 sm:py-6">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Wiring diagram"
        className="h-auto w-full min-w-[320px]"
      >
        <rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.height}
          fill="transparent"
        />

        {layout.connections.map((connection) => (
          <path
            key={connection.id}
            d={wirePath(connection.from, connection.to)}
            fill="none"
            stroke={connection.color}
            strokeWidth={2.2}
            strokeLinecap="round"
            className="motion-trace"
            style={{
              strokeDasharray: 220,
              strokeDashoffset: 220,
            }}
          />
        ))}

        {layout.parts.map((part) => {
          const photoSrc = resolvePhotoPath(part.photoHint);
          return (
            <g key={part.instanceId}>
              <rect
                x={part.x}
                y={part.y}
                width={part.width}
                height={part.height}
                rx={part.kind === "board" ? 10 : 8}
                fill={part.kind === "board" ? "#d7e2dc" : "#e8efeb"}
                stroke="#2c3a42"
                strokeWidth={1.4}
              />
              <rect
                x={part.x + 10}
                y={part.y + 10}
                width={part.width - 20}
                height={18}
                rx={4}
                fill="#f5f8f6"
                stroke="#1f5a56"
                strokeWidth={1}
                opacity={0.9}
              />
              <text
                x={part.x + part.width / 2}
                y={part.y + 23}
                textAnchor="middle"
                fontSize={10}
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fill="#1f5a56"
              >
                {part.name.length > 18 ? `${part.name.slice(0, 16)}…` : part.name}
              </text>
              {part.photoHint ? (
                <text
                  x={part.x + part.width / 2}
                  y={part.y + part.height - 10}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-mono), ui-monospace, monospace"
                  fill="#4f5f67"
                >
                  {photoSrc ? photoSrc : `photo:${part.photoHint}`}
                </text>
              ) : null}
              {part.pins.map((pin) => (
                <g key={`${part.instanceId}-${pin.pinId}`}>
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={4.5}
                    fill={pinFill(pin.kinds)}
                    stroke="#121a20"
                    strokeWidth={1}
                  />
                  <text
                    x={pin.side === "left" ? pin.x + 10 : pin.x - 10}
                    y={pin.y + 3}
                    textAnchor={pin.side === "left" ? "start" : "end"}
                    fontSize={8}
                    fontFamily="var(--font-mono), ui-monospace, monospace"
                    fill="#2c3a42"
                  >
                    {pin.label}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
