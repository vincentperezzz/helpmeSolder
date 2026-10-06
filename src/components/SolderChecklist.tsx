"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DoneToggle } from "@/components/guide/DoneToggle";
import { CheckIcon } from "@/components/guide/icons";
import { Switch } from "@/components/guide/Switch";
import { scrollRowIntoPanel } from "@/components/guide/scroll";
import type { Guide } from "@/lib/catalog/types";
import {
  groupJoints,
  pinName,
  progressLabel,
  readSolderTicks,
  writeSolderTicks,
  type TabId,
} from "@/components/guide/model";
import { badgeTextColor } from "@/components/wokwi/badges";
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
  /** Switch the right panel to another tab, for the "Open Steps" button. */
  onOpenTab?: (tab: TabId) => void;
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
    <p className="ga-power-note">
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
  onOpenTab,
}: SolderChecklistProps) {
  const plan = useMemo(() => buildSolderPlan(guide), [guide]);
  const groups = useMemo(() => groupJoints(plan.items), [plan.items]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
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
    setJustFinished(adding && next.length === total);
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
    <section aria-label="Solder joints to make">
      <header className="ga-head" data-print-hide="true">
        <h3 className="ga-head-title">Solder joints</h3>
        <p className="ga-head-lede">
          {total === 0
            ? "The connections to solder will appear here once the wiring is added."
            : `Make these ${total} connections in order. Tap one to light it up in the picture.`}
        </p>
      </header>

      {total === 0 ? (
        <div className="space-y-3">
          {plan.power ? <PowerNote text={plan.power} /> : null}
          <p className="text-sm text-mute">No connections yet.</p>
        </div>
      ) : (
        <>
          <div
            data-ga-sticky=""
            data-print-hide="true"
            className="ga-strip sticky top-0 z-10 -mx-4 mb-3 border-y border-line bg-[color-mix(in_oklab,white_90%,var(--paper))] px-4 py-2"
          >
            <div className="ga-strip-top">
              <div className="ga-strip-progress">
                <p className="ga-strip-count" aria-live="polite">
                  {progressLabel(done, total, "soldered")}
                </p>
                <div aria-hidden className="ga-strip-bar">
                  <span style={{ width: `${(done / total) * 100}%` }} />
                </div>
              </div>
              <Switch
                checked={followMode}
                onChange={setFollow}
                tone="flux"
                hintId={followHintId}
                hint="Show one wire at a time in the picture. Mark a joint soldered to move to the next."
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
          </div>

          {allDone ? (
            <div role="status" className="ga-finish" data-fresh={justFinished} data-print-hide="true">
              <span className="ga-finish-mark" aria-hidden>
                <CheckIcon size={22} />
              </span>
              <div className="ga-finish-text">
                <p className="ga-finish-title">All wires done</p>
                <p className="ga-finish-sub">Every joint is soldered. Next, follow the build steps.</p>
              </div>
              {onOpenTab ? (
                <button type="button" className="ga-finish-btn" onClick={() => onOpenTab("steps")}>
                  Open Steps
                  <Arrow dir="right" />
                </button>
              ) : null}
            </div>
          ) : null}

          {plan.power ? <PowerNote text={plan.power} /> : null}

          {groups.map((group) => (
            <div key={group.id} className="ga-joint-group">
              {group.label ? <h4 className="ga-group-title">{group.label}</h4> : null}
              <ol className="ga-solder-list">
                {group.joints.map(({ item, number }) => {
                  const checked = ticked.includes(item.id);
                  const selected = focusId === item.id;
                  const highlighted = hoverId === item.id;
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
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Wire ${number}: ${item.sentence}. Show in the picture.`}
                        onClick={() => onFocusChange(selected ? null : item.id)}
                        className="ga-solder-body"
                      >
                        <span
                          aria-hidden
                          className="ga-solder-badge"
                          style={{ backgroundColor: item.color, color: badgeTextColor(item.color) }}
                        >
                          {number}
                        </span>
                        <span className="ga-solder-text">
                          <span className="ga-solder-route">
                            <span className="ga-solder-end">
                              <span className="ga-solder-part">{item.from.part}</span>
                              <strong>{pinName(item.from.pin)}</strong>
                            </span>
                            <span className="ga-solder-arrow" aria-hidden>
                              <Arrow dir="right" />
                            </span>
                            <span className="ga-solder-end">
                              <span className="ga-solder-part">{item.to.part}</span>
                              <strong>{pinName(item.to.pin)}</strong>
                            </span>
                          </span>
                          <span className="ga-solder-chip">
                            <span
                              aria-hidden
                              className="ga-solder-swatch"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.colorName} wire
                          </span>
                          {where ? <span className="ga-solder-note">Where: {where}</span> : null}
                          {item.why ? <span className="ga-solder-note">{item.why}</span> : null}
                        </span>
                      </button>
                      <DoneToggle
                        pressed={checked}
                        onToggle={() => toggle(item.id)}
                        doneLabel="Soldered"
                        openLabel="Mark soldered"
                        context={`wire ${number}`}
                      />
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
