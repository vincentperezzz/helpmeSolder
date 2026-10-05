/** Pure helpers for the daily visitors chart. No React, no dates from the clock. */

export type DailyPoint = { day: string; visitors: number; creators: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NICE_STEPS = [1, 2, 5];

export type Axis = { max: number; ticks: number[] };

/**
 * Round y axis for whole-number counts. Gives 2 to 4 intervals (3 to 5 tick labels)
 * with a step of 1, 2 or 5 times a power of ten. All-zero data gets a flat 0 to 4 axis.
 */
export function niceAxis(dataMax: number): Axis {
  const top = Number.isFinite(dataMax) ? Math.max(0, Math.ceil(dataMax)) : 0;
  if (top === 0) return { max: 4, ticks: [0, 2, 4] };
  let step = 1;
  for (let power = 1; ; power *= 10) {
    const found = NICE_STEPS.map((s) => s * power).find((s) => Math.ceil(top / s) <= 4);
    if (found !== undefined) {
      step = found;
      break;
    }
  }
  const intervals = Math.max(2, Math.ceil(top / step));
  const ticks: number[] = [];
  for (let i = 0; i <= intervals; i++) ticks.push(i * step);
  return { max: intervals * step, ticks };
}

/** "2026-10-05" becomes "Oct 5", always in UTC. Unparseable input is returned as is. */
export function formatDayLabel(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return day;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return day;
  return `${month} ${Number(match[3])}`;
}

function plural(count: number, one: string): string {
  return `${count} ${count === 1 ? one : `${one}s`}`;
}

/** "Oct 4: 12 visitors, 2 creators". */
export function tooltipText(point: DailyPoint): string {
  return `${formatDayLabel(point.day)}: ${plural(point.visitors, "visitor")}, ${plural(point.creators, "creator")}`;
}

/** Busiest visitor day. Ties go to the most recent day. Null when nobody visited. */
export function pickBusiest(series: DailyPoint[]): DailyPoint | null {
  let best: DailyPoint | null = null;
  for (const point of series) {
    if (point.visitors > 0 && (!best || point.visitors >= best.visitors)) best = point;
  }
  return best;
}

/** Indexes that get an x label: today (last), every 7th day back from it, and the first day. */
export function xLabelIndexes(length: number): number[] {
  if (length <= 0) return [];
  const picked: number[] = [];
  for (let i = length - 1; i >= 0; i -= 7) picked.push(i);
  const oldest = picked[picked.length - 1];
  if (oldest >= 4) picked.push(0);
  else picked[picked.length - 1] = 0; // close to the first day: label the first day instead
  return picked.reverse();
}

export function chartSummary(series: DailyPoint[]): string {
  const total = series.reduce((sum, p) => sum + p.visitors, 0);
  const busiest = pickBusiest(series);
  const base = `Daily visitors and guide creators, last ${series.length} days. ${plural(total, "visitor")} in total.`;
  return busiest
    ? `${base} Busiest day ${formatDayLabel(busiest.day)} with ${plural(busiest.visitors, "visitor")}.`
    : `${base} No visits recorded.`;
}

export function hasAnyActivity(series: DailyPoint[]): boolean {
  return series.some((p) => p.visitors > 0 || p.creators > 0);
}
