import {
  BB_COLS,
  BB_HEIGHT,
  BB_ORIGIN_X,
  BB_RAIL_Y,
  BB_ROW_Y,
  BB_STEP,
  BB_WIDTH,
} from "./constants";

export function BreadboardVisual({
  instanceId,
  name,
}: {
  instanceId: string;
  name: string;
}) {
  const rowsTop = ["a", "b", "c", "d", "e"];
  const rowsBot = ["f", "g", "h", "i", "j"];
  const hole = (cx: number, cy: number, key: string, fill = "#8f979c") => (
    <circle key={key} cx={cx} cy={cy} r={1.55} fill={fill} />
  );
  const colX = (col: number) => BB_ORIGIN_X + (col - 1) * BB_STEP;

  return (
    <div
      data-instance={instanceId}
      className="relative select-none"
      draggable={false}
      style={{ width: BB_WIDTH, height: BB_HEIGHT }}
    >
      <p className="pointer-events-none absolute -top-5 left-0 text-[13px] leading-none font-semibold tracking-wide text-ink-soft">
        {name}
      </p>
      <svg
        viewBox={`0 0 ${BB_WIDTH} ${BB_HEIGHT}`}
        width={BB_WIDTH}
        height={BB_HEIGHT}
        aria-label={name}
      >
        <rect
          x="0"
          y="0"
          width={BB_WIDTH}
          height={BB_HEIGHT}
          rx="5"
          fill="#f4efe4"
          stroke="#b9ae96"
        />
        <rect x="6" y="6" width={BB_WIDTH - 12} height={26} rx="2" fill="#f3d6d1" />
        <rect x="6" y={BB_HEIGHT - 32} width={BB_WIDTH - 12} height={26} rx="2" fill="#d6e3f1" />
        <line
          x1="10"
          y1={BB_RAIL_Y.topPlus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.topPlus}
          stroke="#c62828"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <line
          x1="10"
          y1={BB_RAIL_Y.topMinus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.topMinus}
          stroke="#1565c0"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <line
          x1="10"
          y1={BB_RAIL_Y.botPlus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.botPlus}
          stroke="#c62828"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <line
          x1="10"
          y1={BB_RAIL_Y.botMinus}
          x2={BB_WIDTH - 10}
          y2={BB_RAIL_Y.botMinus}
          stroke="#1565c0"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <text x="8" y={BB_RAIL_Y.topPlus + 4.5} fontSize="13" fill="#c62828" fontFamily="monospace">
          +
        </text>
        <text x="8" y={BB_RAIL_Y.topMinus + 4.5} fontSize="13" fill="#1565c0" fontFamily="monospace">
          −
        </text>
        <text x="8" y={BB_RAIL_Y.botPlus + 4.5} fontSize="13" fill="#c62828" fontFamily="monospace">
          +
        </text>
        <text x="8" y={BB_RAIL_Y.botMinus + 4.5} fontSize="13" fill="#1565c0" fontFamily="monospace">
          −
        </text>
        {Array.from({ length: BB_COLS }, (_, i) => {
          const col = i + 1;
          const x = colX(col);
          return (
            <g key={`rail-${col}`}>
              {hole(x, BB_RAIL_Y.topPlus, `tp-${col}`, "#b07171")}
              {hole(x, BB_RAIL_Y.topMinus, `tm-${col}`, "#6f86a8")}
              {hole(x, BB_RAIL_Y.botPlus, `bp-${col}`, "#b07171")}
              {hole(x, BB_RAIL_Y.botMinus, `bm-${col}`, "#6f86a8")}
            </g>
          );
        })}
        {rowsTop.map((row) =>
          Array.from({ length: BB_COLS }, (_, i) => {
            const col = i + 1;
            return hole(colX(col), BB_ROW_Y[row], `${row}${col}`);
          }),
        )}
        {rowsBot.map((row) =>
          Array.from({ length: BB_COLS }, (_, i) => {
            const col = i + 1;
            return hole(colX(col), BB_ROW_Y[row], `${row}${col}`);
          }),
        )}
        <rect
          x="16"
          y="90"
          width={BB_WIDTH - 32}
          height="18"
          rx="2"
          fill="#e7dcc8"
          opacity="0.95"
        />
        {[5, 10, 15, 20, 25, 30].map((col) => (
          <text
            key={`n-${col}`}
            x={colX(col)}
            y="103.5"
            textAnchor="middle"
            fontSize="12"
            fill="#8a7f6c"
            fontFamily="monospace"
          >
            {col}
          </text>
        ))}
      </svg>
    </div>
  );
}
