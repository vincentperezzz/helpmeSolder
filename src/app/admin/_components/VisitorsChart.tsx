import {
  chartSummary,
  formatDayLabel,
  niceAxis,
  pickBusiest,
  tooltipText,
  xLabelIndexes,
  type DailyPoint,
} from "@/lib/admin/chart";

const W = 480;
const H = 240;
const M = { left: 34, right: 8, top: 24, bottom: 30 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const BASE = M.top + PLOT_H;

/** Column with rounded top corners and a flat bottom on the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/**
 * Daily visitors as columns, daily guide creators as a line, one shared y axis.
 * Server rendered inline SVG. Tooltips are native SVG titles, so no client script.
 */
export function VisitorsChart({ series }: { series: DailyPoint[] }) {
  const n = series.length;
  const busiest = pickBusiest(series);
  const axis = niceAxis(Math.max(0, ...series.map((p) => Math.max(p.visitors, p.creators))));
  const y = (v: number) => M.top + PLOT_H * (1 - v / axis.max);
  const slot = n > 0 ? PLOT_W / n : PLOT_W;
  const barW = Math.max(2, slot - 4);
  const cx = (i: number) => M.left + slot * i + slot / 2;
  const labelled = new Set(xLabelIndexes(n));
  const todayIndex = n - 1;

  const line = series.map((p, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${y(p.creators).toFixed(1)}`).join("");
  const busiestIndex = busiest ? series.findIndex((p) => p.day === busiest.day) : -1;
  const busiestAnchor = busiestIndex > n - 5 ? "end" : busiestIndex < 4 ? "start" : "middle";
  const busiestX = busiestAnchor === "end" ? cx(busiestIndex) + barW / 2 : busiestAnchor === "start" ? cx(busiestIndex) - barW / 2 : cx(busiestIndex);

  return (
    <figure className="m-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm bg-copper" />
          Visitors (columns)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" width="22" height="10" viewBox="0 0 22 10">
            <line x1="0" y1="5" x2="22" y2="5" className="stroke-flux" strokeWidth="2" />
            <circle cx="11" cy="5" r="4" className="fill-flux stroke-paper" strokeWidth="2" />
          </svg>
          Guide creators (line)
        </span>
      </div>
      <svg
        role="img"
        aria-label={chartSummary(series)}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full max-w-3xl"
      >
        {axis.ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? "stroke-line-strong" : "stroke-line"}
              strokeWidth="1"
            />
            <text x={M.left - 6} y={y(t) + 4} textAnchor="end" fontSize="13" className="fill-ink-soft">
              {t}
            </text>
          </g>
        ))}

        {n > 0 ? (
          <rect
            x={M.left + slot * todayIndex}
            y={M.top}
            width={slot}
            height={PLOT_H}
            className="fill-paper-deep"
            opacity="0.7"
          />
        ) : null}

        {series.map((p, i) => {
          const h = p.visitors > 0 ? Math.max(2, BASE - y(p.visitors)) : 0;
          return h > 0 ? (
            <path
              key={p.day}
              d={columnPath(cx(i) - barW / 2, BASE - h, barW, h, 3)}
              className={i === todayIndex ? "fill-copper-deep" : "fill-copper"}
            />
          ) : null;
        })}

        <path d={line} fill="none" className="stroke-flux" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((p, i) =>
          p.creators > 0 ? (
            <circle
              key={p.day}
              cx={cx(i)}
              cy={y(p.creators)}
              r="4"
              className="fill-flux stroke-paper"
              strokeWidth="2"
            />
          ) : null,
        )}

        {busiest ? (
          <text
            x={busiestX}
            y={y(busiest.visitors) - 6}
            textAnchor={busiestAnchor}
            fontSize="13"
            fontWeight="600"
            className="fill-ink"
          >
            {`Busiest: ${busiest.visitors}`}
          </text>
        ) : null}

        {series.map((p, i) =>
          labelled.has(i) ? (
            <text
              key={p.day}
              x={cx(i)}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === todayIndex ? "end" : "middle"}
              fontSize="13"
              fontWeight={i === todayIndex ? 700 : 400}
              className={i === todayIndex ? "fill-ink" : "fill-ink-soft"}
            >
              {formatDayLabel(p.day)}
            </text>
          ) : null,
        )}

        {series.map((p, i) => (
          <rect
            key={p.day}
            x={M.left + slot * i}
            y={M.top}
            width={slot}
            height={PLOT_H}
            fill="transparent"
          >
            <title>{tooltipText(p)}</title>
          </rect>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Visitors and guide creators per day, last {n} days (UTC)</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Visitors</th>
            <th scope="col">Guide creators</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.day}>
              <th scope="row">{formatDayLabel(p.day)}</th>
              <td>{p.visitors}</td>
              <td>{p.creators}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
