"use client";

import { useEffect, useState } from "react";
import type { Guide, GuideStep } from "@/lib/catalog/types";
import { DoneToggle } from "./DoneToggle";
import { CheckIcon } from "./icons";
import {
  mentionsSoldering,
  nextStepId,
  readStepTicks,
  writeStepTicks,
  type TabId,
} from "./model";

type StepsPanelProps = {
  guideId: string;
  guide: Guide;
  steps: GuideStep[];
  /** Lets a step that talks about soldering jump to the Solder tab. */
  onOpenTab?: (tab: TabId) => void;
};

/** The build order: a timeline of steps, each with its own Done button. */
export function StepsPanel({ guideId, steps, onOpenTab }: StepsPanelProps) {
  const [ticked, setTicked] = useState<string[]>([]);
  const [opened, setOpened] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicked(readStepTicks(guideId));
  }, [guideId]);

  const upNext = nextStepId(
    steps.map((step) => step.id),
    ticked,
  );

  function toggle(id: string) {
    const next = ticked.includes(id) ? ticked.filter((entry) => entry !== id) : [...ticked, id];
    setTicked(next);
    writeStepTicks(guideId, next);
    // A step that was just ticked folds away; one that was just unticked stays open.
    setOpened((current) => current.filter((entry) => entry !== id));
  }

  function toggleOpen(id: string) {
    setOpened((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <section aria-label="Build steps">
      <header className="ga-head" data-print-hide="true">
        <h3 className="ga-head-title">Build steps</h3>
        <p className="ga-head-lede">
          Do these in order. The soldering itself is on the Solder tab.
        </p>
      </header>

      {steps.length === 0 ? (
        <p className="text-sm text-mute">No steps yet.</p>
      ) : (
        <ol className="ga-steps">
          {steps.map((step) => {
            const done = ticked.includes(step.id);
            const folded = done && !opened.includes(step.id);
            const next = step.id === upNext;
            const bodyId = `step-body-${guideId}-${step.id}`;
            const state = ["ga-step", done ? "is-done" : "", next ? "is-next" : "", folded ? "is-folded" : ""]
              .filter(Boolean)
              .join(" ");
            const toSolder = onOpenTab && mentionsSoldering(`${step.title} ${step.body}`);
            return (
              <li key={step.id} className={state}>
                {done ? (
                  <button
                    type="button"
                    className="ga-step-head is-button"
                    aria-expanded={!folded}
                    aria-controls={bodyId}
                    onClick={() => toggleOpen(step.id)}
                  >
                    <span className="ga-step-check" aria-hidden>
                      <CheckIcon size={18} />
                    </span>
                    <span className="ga-step-label">Step {step.order}</span>
                    <span className="ga-step-title">{step.title}</span>
                  </button>
                ) : (
                  <div className="ga-step-head">
                    <span className="ga-step-label">Step {step.order}</span>
                    {next ? <span className="ga-step-flag">Up next</span> : null}
                    <span className="ga-step-title">{step.title}</span>
                  </div>
                )}
                <div id={bodyId} className="ga-step-fold" data-folded={folded} inert={folded}>
                  <div className="ga-step-fold-inner">
                    <p className="ga-step-body">{step.body}</p>
                    <div className="ga-step-actions">
                      <DoneToggle
                        pressed={done}
                        onToggle={() => toggle(step.id)}
                        doneLabel="Done"
                        openLabel="Mark done"
                        context={`step ${step.order}`}
                      />
                      {toSolder ? (
                        <button
                          type="button"
                          className="ga-strip-link ga-step-link"
                          onClick={() => onOpenTab?.("solder")}
                        >
                          Go to joints
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
