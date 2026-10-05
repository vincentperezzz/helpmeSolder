"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Guide } from "@/lib/catalog/types";
import { buildSolderPlan } from "@/lib/guides/solder-plan";

type SolderChecklistProps = {
  guide: Guide;
  followMode: boolean;
  onFollowModeChange: (value: boolean) => void;
  hideOthers: boolean;
  onHideOthersChange: (value: boolean) => void;
  /** The wire shown on its own in the diagram: the selected or current one. */
  focusId: string | null;
  onFocusChange: (id: string | null) => void;
  /** The wire the pointer or keyboard is on, here or in the diagram. */
  hoverId: string | null;
  onHoverChange: (id: string | null) => void;
};

const controlButton =
  "min-h-11 rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-copper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper disabled:cursor-not-allowed disabled:opacity-50";

const storageKey = (guideId: string) => `helpmesolder:solder-ticks:${guideId}`;

function readTicks(guideId: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(guideId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeTicks(guideId: string, ids: string[]) {
  try {
    window.localStorage.setItem(storageKey(guideId), JSON.stringify(ids));
  } catch {
    // Storage blocked: ticks still work for this visit.
  }
}

export function SolderChecklist({
  guide,
  followMode,
  onFollowModeChange,
  hideOthers,
  onHideOthersChange,
  focusId,
  onFocusChange,
  hoverId,
  onHoverChange,
}: SolderChecklistProps) {
  const plan = useMemo(() => buildSolderPlan(guide), [guide]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const rows = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    // Read after mount so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicked(readTicks(guide.id));
    setLoaded(true);
  }, [guide.id]);

  const ids = plan.items.map((item) => item.id);
  const total = ids.length;
  const done = plan.items.filter((item) => ticked.includes(item.id)).length;
  const allDone = total > 0 && done === total;
  const firstOpen = ids.find((id) => !ticked.includes(id)) ?? null;
  const focusIndex = focusId ? ids.indexOf(focusId) : -1;

  // Follow mode that was saved or just turned on starts at the first open wire.
  useEffect(() => {
    if (followMode && loaded && focusId === null && firstOpen) {
      onFocusChange(firstOpen);
    }
  }, [followMode, loaded, focusId, firstOpen, onFocusChange]);

  // A wire picked in the diagram brings its row into view.
  useEffect(() => {
    if (!focusId) return;
    rows.current.get(focusId)?.scrollIntoView({ block: "nearest" });
  }, [focusId]);

  function toggle(id: string) {
    const adding = !ticked.includes(id);
    const next = adding ? [...ticked, id] : ticked.filter((entry) => entry !== id);
    setTicked(next);
    writeTicks(guide.id, next);
    if (adding && followMode && (focusId === null || focusId === id)) {
      const start = ids.indexOf(id);
      const after = [...ids.slice(start + 1), ...ids.slice(0, start)];
      onFocusChange(after.find((other) => !next.includes(other)) ?? null);
    }
  }

  function setFollow(value: boolean) {
    onFollowModeChange(value);
    onFocusChange(value ? firstOpen : null);
  }

  function showAll() {
    onFollowModeChange(false);
    onFocusChange(null);
  }

  function step(delta: number) {
    const from = focusIndex === -1 ? (delta > 0 ? -1 : total) : focusIndex;
    const target = ids[Math.min(total - 1, Math.max(0, from + delta))];
    if (target) onFocusChange(target);
  }

  return (
    <section
      aria-label="What to solder where, step by step"
      className="rounded-2xl border border-line-strong bg-white/70 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-ink">What to solder where</h2>
        {total > 0 ? (
          <p className="text-sm font-medium text-flux" aria-live="polite">
            {done} of {total} done
          </p>
        ) : null}
      </div>

      {plan.power ? (
        <p className="mt-3 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Power: </span>
          {plan.power}
        </p>
      ) : null}

      {total === 0 ? (
        <p className="mt-3 text-sm text-mute">
          No connections yet. They will appear here once the wiring is added.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-mute">
            Do these in order. Tick each one when the joint is done. This list
            matches the wiring picture.
          </p>

          <div data-print-hide="true" className="mt-3 space-y-2">
            <button
              type="button"
              role="switch"
              aria-checked={followMode}
              onClick={() => setFollow(!followMode)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-line-strong bg-white px-3 text-left text-sm font-semibold text-ink hover:border-copper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
            >
              <span
                aria-hidden
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  followMode ? "bg-flux" : "bg-line-strong"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
                    followMode ? "left-[1.375rem]" : "left-0.5"
                  }`}
                />
              </span>
              Follow along: show one wire at a time
            </button>

            {followMode ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={focusIndex === 0}
                  className={controlButton}
                >
                  Previous wire
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={focusIndex === total - 1 || focusId === null}
                  className={controlButton}
                >
                  Next wire
                </button>
              </div>
            ) : null}

            {followMode || focusId !== null ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={hideOthers}
                    onChange={(event) => onHideOthersChange(event.target.checked)}
                    className="h-5 w-5 accent-[var(--flux)]"
                  />
                  Hide the other wires (instead of dimming them)
                </label>
                <button type="button" onClick={showAll} className={controlButton}>
                  Show all wires
                </button>
              </div>
            ) : null}

            {followMode && allDone ? (
              <p role="status" className="text-sm font-semibold text-flux">
                All wires done
              </p>
            ) : null}
          </div>

          <ol className="mt-3 grid gap-2">
            {plan.items.map((item, index) => {
              const checked = ticked.includes(item.id);
              const selected = focusId === item.id;
              const highlighted = hoverId === item.id;
              const inputId = `solder-${guide.id}-${item.id}`;
              const where =
                item.note && !item.sentence.toLowerCase().includes(item.note.toLowerCase())
                  ? item.note
                  : null;
              return (
                <li
                  key={item.id}
                  ref={(node) => {
                    if (node) rows.current.set(item.id, node);
                    else rows.current.delete(item.id);
                  }}
                  onMouseEnter={() => onHoverChange(item.id)}
                  onMouseLeave={() => onHoverChange(null)}
                  onFocus={() => onHoverChange(item.id)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      onHoverChange(null);
                    }
                  }}
                  className={`flex min-h-14 items-stretch rounded-xl border transition-colors ${
                    selected
                      ? "border-copper bg-copper/10 ring-2 ring-copper/40"
                      : highlighted
                        ? "border-copper bg-copper/5 ring-2 ring-copper/30"
                        : checked
                          ? "border-flux/40 bg-flux/5"
                          : "border-line bg-white hover:border-line-strong"
                  }`}
                >
                  <label
                    htmlFor={inputId}
                    className="flex min-w-11 cursor-pointer items-start justify-center py-3 pl-3 pr-1"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                      aria-label={`Done: wire ${index + 1}`}
                      className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[var(--flux)]"
                    />
                  </label>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onFocusChange(selected ? null : item.id)}
                    className="min-w-0 flex-1 rounded-r-xl px-3 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-copper"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mute">
                      <span className="font-semibold text-ink">{index + 1}.</span>
                      <span
                        role="img"
                        aria-label={`${item.colorName} wire`}
                        title={`${item.colorName} wire`}
                        className="inline-block h-3.5 w-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.colorName} wire</span>
                    </span>
                    <span
                      className={`mt-1 block text-base text-ink ${
                        checked ? "opacity-60" : ""
                      }`}
                    >
                      <strong>{item.from.part}</strong>, {item.from.pin} to{" "}
                      <strong>{item.to.part}</strong>, {item.to.pin}
                    </span>
                    {where ? (
                      <span className="mt-1 block text-sm text-mute">Where: {where}</span>
                    ) : null}
                    {item.why ? (
                      <span className="mt-1 block text-sm text-mute">{item.why}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
