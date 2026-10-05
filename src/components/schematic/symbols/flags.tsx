type FlagProps = {
  x: number;
  y: number;
  label?: string;
  className?: string;
  highlighted?: boolean;
};

const STROKE = 1.8;
const STROKE_HIGHLIGHTED = 2.6;

export function GroundFlag({ x, y, label, className, highlighted }: FlagProps) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={className}
      data-highlighted={highlighted ? "true" : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={highlighted ? STROKE_HIGHLIGHTED : STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 0V8M-9 8H9M-6 12.5H6M-3 17H3" />
      {label ? (
        <text x={0} y={30} textAnchor="middle" fontSize={10} fill="currentColor" stroke="none">
          {label}
        </text>
      ) : null}
    </g>
  );
}

export function PowerFlag({ x, y, label, className, highlighted }: FlagProps) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={className}
      data-highlighted={highlighted ? "true" : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={highlighted ? STROKE_HIGHLIGHTED : STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 0V-9M-8 -9H8" />
      {label ? (
        <text x={0} y={-14} textAnchor="middle" fontSize={10} fill="currentColor" stroke="none">
          {label}
        </text>
      ) : null}
    </g>
  );
}
