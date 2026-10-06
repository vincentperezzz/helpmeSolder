/** Pure timeline helpers for the How it works storyboard (one shared 14 s clock). */

export const LOOP_MS = 14000;

export type BeatId = "ask" | "plan" | "wire" | "open";

export interface Beat {
  id: BeatId;
  label: string;
  hint: string;
  start: number;
  end: number;
}

export const BEATS: readonly Beat[] = [
  { id: "ask", label: "Ask", hint: "Describe the build in a chat", start: 0, end: 3000 },
  { id: "plan", label: "Plan", hint: "Tool calls are checked, unsafe pins bounce", start: 3000, end: 7800 },
  { id: "wire", label: "Wire", hint: "Numbered wires draw one by one", start: 7800, end: 11200 },
  { id: "open", label: "Open", hint: "A secret link opens the guide on your phone", start: 11200, end: LOOP_MS },
];

/** Wrap any clock reading (the browser reports cumulative time) into one loop. */
export function wrapMs(ms: number): number {
  const wrapped = ms % LOOP_MS;
  return wrapped < 0 ? wrapped + LOOP_MS : wrapped;
}

export function beatAt(ms: number): BeatId {
  const t = wrapMs(ms);
  const beat = BEATS.find((b) => t >= b.start && t < b.end);
  return (beat ?? BEATS[BEATS.length - 1]).id;
}

/** Where to seek the shared clock so a beat plays from its start. */
export function seekTimeFor(id: BeatId): number {
  const beat = BEATS.find((b) => b.id === id);
  return beat ? beat.start + 20 : 0;
}

/** A moment in the loop as a keyframe percentage. */
export function pct(ms: number): number {
  return Math.round((Math.min(Math.max(ms, 0), LOOP_MS) / LOOP_MS) * 100000) / 1000;
}

export type Step = readonly [t: number, css: string, ease?: string];

const DEFAULT_EASE = "cubic-bezier(0.16,1,0.3,1)";

/**
 * Build an @keyframes rule from timed steps. The first and last states are
 * extended to 0% and 100% so an element rests in its first state before its
 * moment and in its last state after it, and loops cleanly.
 */
export function buildKeyframes(name: string, steps: readonly Step[]): string {
  if (steps.length === 0) return "";
  const frames = steps.map(([t, css, ease], i) => {
    const timing = i < steps.length - 1 ? `;animation-timing-function:${ease ?? DEFAULT_EASE}` : "";
    return { at: pct(t), css: `${css}${timing}` };
  });
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (first.at > 0) frames.unshift({ at: 0, css: first.css });
  if (last.at < 100) frames.push({ at: 100, css: last.css });
  return `@keyframes ${name}{${frames.map((f) => `${f.at}%{${f.css}}`).join("")}}`;
}
