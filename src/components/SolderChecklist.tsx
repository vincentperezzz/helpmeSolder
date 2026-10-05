"use client";

import { useEffect, useMemo, useState } from "react";
import type { Guide } from "@/lib/catalog/types";
import { buildSolderPlan } from "@/lib/guides/solder-plan";

type SolderChecklistProps = {
  guide: Guide;
};

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

export function SolderChecklist({ guide }: SolderChecklistProps) {
  const plan = useMemo(() => buildSolderPlan(guide), [guide]);
  const [ticked, setTicked] = useState<string[]>([]);

  useEffect(() => {
    // Read after mount so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicked(readTicks(guide.id));
  }, [guide.id]);

  const total = plan.items.length;
  const done = plan.items.filter((item) => ticked.includes(item.id)).length;

  function toggle(id: string) {
    setTicked((current) => {
      const next = current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id];
      writeTicks(guide.id, next);
      return next;
    });
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
          <ol className="mt-3 grid gap-2">
            {plan.items.map((item, index) => {
              const checked = ticked.includes(item.id);
              const inputId = `solder-${guide.id}-${item.id}`;
              return (
                <li key={item.id}>
                  <label
                    htmlFor={inputId}
                    className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                      checked
                        ? "border-flux/40 bg-flux/5"
                        : "border-line bg-white hover:border-line-strong"
                    }`}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                      className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[var(--flux)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mute">
                        <span className="font-semibold text-ink">{index + 1}.</span>
                        <span
                          aria-hidden
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
                      {item.why ? (
                        <span className="mt-1 block text-sm text-mute">{item.why}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
