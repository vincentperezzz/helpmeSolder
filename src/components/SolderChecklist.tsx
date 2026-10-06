"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Switch } from "@/components/guide/Switch";
import { scrollRowIntoPanel } from "@/components/guide/scroll";
import type { Guide } from "@/lib/catalog/types";
import { readSolderTicks, writeSolderTicks } from "@/components/guide/model";
import { buildSolderPlan } from "@/lib/guides/solder-plan";

type SolderChecklistProps = {
  guide: Guide;
  followMode: boolean;
  onFollowModeChange: (value: boolean) => void;
  hideOthers: boolean;
  onHideOthersChange: (value: boolean) => void;
  focusId: string | null;
  onFocusChange: (id: string | null) => void;
  hoverId: string | null;
  onHoverChange: (id: string | null) => void;
};

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M13 8H3m4-4L3 8l4 4" : "M3 8h10M9 4l4 4-4 4"} />
    </svg>
  );
}

function PowerNote({ text }: { text: string }) {
  return (
    <p className="mb-3 rounded-[10px] border border-line bg-paper/70 px-3 py-2 text-sm leading-relaxed text-ink-soft">
      <span className="font-semibold text-ink">Power: </span>
      {text}
    </p>
  );
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicked(readSolderTicks(guide.id));
    setLoaded(true);
  }, [guide.id]);

  const ids = plan.items.map((item) => item.id);
  const total = ids.length;
  const done = plan.items.filter((item) => ticked.includes(item.id)).length;
  const allDone = total > 0 && done === total;
  const firstOpen = ids.find((id) => !ticked.includes(id)) ?? null;
  const focusIndex = focusId ? ids.indexOf(focusId) : -1;

  useEffect(() => {
    if (followMode && loaded && focusId === null && firstOpen) {
      onFocusChange(firstOpen);
    }
  }, [followMode, loaded, focusId, firstOpen, onFocusChange]);

  useEffect(() => {
    if (!focusId) return;
    scrollRowIntoPanel(rows.current.get(focusId));
  }, [focusId]);

  function toggle(id: string) {
    const adding = !ticked.includes(id);
    const next = adding ? [...ticked, id] : ticked.filter((entry) => entry !== id);
    setTicked(next);
    writeSolderTicks(guide.id, next);
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

  const followHintId = useId();

  return (
    <section aria-label="What to solder where, step by step">
      {total === 0 ? (
        <div className="space-y-3">
          {plan.power ? <PowerNote text={plan.power} /> : null}
          <p className="text-sm text-mute">
            No connections yet. They will appear here once the wiring is added.
          </p>
        </div>
      ) : (
        <>
          <div
            data-ga-sticky=""
            data-print-hide="true"
            className="ga-strip sticky top-0 z-10 -mx-4 -mt-3.5 mb-3 border-b border-line bg-[color-mix(in_oklab,white_90%,var(--paper))] px-4 py-2"
          >
            <div className="ga-strip-top">
              <div className="ga-strip-progress">
                <p className="ga-strip-count" aria-live="polite">
                  {done} of {total} done
                </p>
                <div aria-hidden className="ga-strip-bar">
                  <span
                    className="motion-safe:transition-[width]"
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </div>
              </div>
              <Switch
                checked={followMode}
                onChange={setFollow}
                tone="flux"
                hintId={followHintId}
                hint="Show one wire at a time in the picture. Tick a joint to move to the next."
              >
                Follow along
              </Switch>
            </div>

            {followMode ? (
              <div className="ga-strip-step">
                <button type="button" onClick={() => step(-1)} disabled={focusIndex === 0}>
                  <Arrow dir="left" />
                  Previous wire
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={focusIndex === total - 1 || focusId === null}
                >
                  Next wire
                  <Arrow dir="right" />
                </button>
              </div>
            ) : null}

            {followMode || focusId !== null ? (
              <div className="ga-strip-actions">
                <label className="ga-strip-chip">
                  <input
                    type="checkbox"
                    checked={hideOthers}
                    onChange={(event) => onHideOthersChange(event.target.checked)}
                  />
                  Hide other wires
                </label>
                <button type="button" onClick={showAll} className="ga-strip-link">
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

          {plan.power ? <PowerNote text={plan.power} /> : null}

          <p className="mb-3 text-sm leading-relaxed text-mute">
            Do these in order. Tick each one when the joint is done. This list
            matches the wiring picture.
          </p>

          <ol className="ga-solder-list">
            {plan.items.map((item, index) => {
              const checked = ticked.includes(item.id);
              const selected = focusId === item.id;
              const highlighted = hoverId === item.id;
              const inputId = `solder-${guide.id}-${item.id}`;
              const where =
                item.note && !item.sentence.toLowerCase().includes(item.note.toLowerCase())
                  ? item.note
                  : null;
              const state = [
                "ga-solder-row",
                selected ? "is-selected" : "",
                !selected && highlighted ? "is-hot" : "",
                checked ? "is-done" : "",
              ]
                .filter(Boolean)
                .join(" ");
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
                  className={state}
                >
                  <label htmlFor={inputId} className="ga-solder-check">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                      aria-label={`Done: wire ${index + 1}`}
                      className="ga-solder-input"
                    />
                    <span className="ga-solder-mark" aria-hidden>
                      <span className="ga-solder-num">{index + 1}</span>
                      <svg className="ga-solder-tick" viewBox="0 0 16 16">
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    </span>
                  </label>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onFocusChange(selected ? null : item.id)}
                    className="ga-solder-body"
                  >
                    <span className="ga-solder-meta">
                      <span
                        role="img"
                        aria-label={`${item.colorName} wire`}
                        title={`${item.colorName} wire`}
                        className="ga-solder-swatch"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.colorName} wire</span>
                    </span>
                    <span className="ga-solder-route">
                      <strong>{item.from.part}</strong>, {item.from.pin}
                      <span className="ga-solder-arrow" aria-hidden>
                        →
                      </span>
                      <strong>{item.to.part}</strong>, {item.to.pin}
                    </span>
                    {where ? <span className="ga-solder-note">Where: {where}</span> : null}
                    {item.why ? <span className="ga-solder-note">{item.why}</span> : null}
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
