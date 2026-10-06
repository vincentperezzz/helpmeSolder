"use client";

import { useEffect, useState } from "react";
import type { Guide, GuideStep } from "@/lib/catalog/types";
import { buildSolderItems } from "@/lib/guides/solder-plan";
import { resolveUpNext } from "@/lib/guides/step-progress";
import { AlertIcon, CheckIcon, TipIcon } from "./icons";
import { noteKind, readSolderTicks, readStepTicks, writeStepTicks } from "./model";

type StepsPanelProps = { guideId: string; guide: Guide; steps: GuideStep[] };

/** Vertical timeline. The highlighted step is the first one whose wires are still open. */
export function StepsPanel({ guideId, guide, steps }: StepsPanelProps) {
  const [manual, setManual] = useState<string[]>([]);
  const [wireTicks, setWireTicks] = useState<string[]>([]);

  useEffect(() => {
    // Read after mount so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setManual(readStepTicks(guideId));
    setWireTicks(readSolderTicks(guideId));
  }, [guideId]);

  if (steps.length === 0) {
    return <p className="text-sm text-mute">No steps yet.</p>;
  }

  const progress = resolveUpNext({
    steps,
    wires: buildSolderItems(guide).map((item) => ({
      id: item.id,
      text: `${item.from.part} ${item.from.pin} ${item.to.part} ${item.to.pin} ${item.sentence}`,
    })),
    tickedWireIds: wireTicks,
    manualStepIds: manual,
  });
  const done = new Set(progress.doneIds);
  const currentId = progress.currentId;

  function toggle(id: string) {
    const next = manual.includes(id) ? manual.filter((entry) => entry !== id) : [...manual, id];
    setManual(next);
    writeStepTicks(guideId, next);
  }

  return (
    <ol className="m-0 list-none p-0">
      {steps.map((step, index) => {
        const isDone = done.has(step.id);
        const current = step.id === currentId;
        const last = index === steps.length - 1;
        return (
          <li key={step.id} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3">
            <div className="relative flex justify-center">
              {!last ? (
                <span
                  aria-hidden
                  className={`absolute top-10 -bottom-1 w-0.5 rounded-full ${
                    isDone ? "bg-flux" : "bg-line-strong"
                  }`}
                />
              ) : null}
              <button
                type="button"
                aria-pressed={isDone}
                aria-label={`Step ${step.order}: mark as done`}
                onClick={() => toggle(step.id)}
                className={`brand-mark relative z-[1] grid h-10 w-10 place-items-center rounded-full border-2 text-base transition-colors ${
                  isDone
                    ? "border-flux bg-flux text-white"
                    : current
                      ? "border-copper bg-copper text-white"
                      : "border-line-strong bg-white text-ink-soft hover:border-copper"
                }`}
              >
                {isDone ? <CheckIcon size={18} /> : <span aria-hidden>{step.order}</span>}
              </button>
            </div>
            <div
              className={`mb-3 min-w-0 rounded-[10px] px-3.5 py-3 ${
                current ? "border border-copper/40 bg-white shadow-sm" : "border border-transparent"
              } ${isDone ? "opacity-70" : ""}`}
            >
              {current ? (
                <p className="mb-0.5 text-xs font-semibold text-copper-deep">Up next</p>
              ) : null}
              <p className="text-base leading-snug font-bold tracking-tight text-ink">{step.title}</p>
              <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
                {step.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type NotesPanelProps = {
  notes: string[];
  expiryLabel: string;
  retentionDays: number;
};

/** Notes as tinted callouts, then the small print as a quiet footer. */
export function NotesPanel({ notes, expiryLabel, retentionDays }: NotesPanelProps) {
  return (
    <div className="space-y-8">
      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => {
            const warn = noteKind(note) === "heads-up";
            return (
              <li
                key={note}
                className={`flex gap-3 rounded-[10px] border p-3.5 ${
                  warn
                    ? "border-warn-line bg-warn-bg text-warn-ink"
                    : "border-flux/25 bg-flux/[0.07] text-ink"
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 ${warn ? "text-warn-ink" : "text-flux"}`}
                >
                  {warn ? <AlertIcon size={20} /> : <TipIcon size={20} />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-wide uppercase">
                    {warn ? "Heads up" : "Tip"}
                  </p>
                  <p className="mt-0.5 text-[15px] leading-relaxed">{note}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-mute">No notes for this guide.</p>
      )}

      <section aria-labelledby="ga-about" className="space-y-2 border-t border-line pt-4">
        <h3 id="ga-about" className="text-xs font-semibold text-mute">
          About this guide
        </h3>
        <p className="text-xs leading-relaxed text-mute">
          Saved until at least{" "}
          <strong className="font-medium text-ink-soft">{expiryLabel}</strong>. Guides that
          nobody opens for {retentionDays} days are deleted automatically, and opening this
          link resets the timer. Bookmark it or print it if you want to keep it.
        </p>
        <p className="text-xs leading-relaxed text-mute">
          Part drawings use the MIT-licensed Wokwi Elements.
        </p>
      </section>
    </div>
  );
}
