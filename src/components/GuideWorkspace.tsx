"use client";

import { useState } from "react";
import { PrepParts } from "@/components/PrepParts";
import { SolderChecklist } from "@/components/SolderChecklist";
import { ToolsList } from "@/components/ToolsList";
import { WokwiDiagram } from "@/components/WokwiDiagram";
import type { Guide, GuideStep } from "@/lib/catalog/types";

type GuideWorkspaceProps = {
  guide: Guide;
  orderedSteps: GuideStep[];
};

export function GuideWorkspace({ guide, orderedSteps }: GuideWorkspaceProps) {
  const [enlarged, setEnlarged] = useState(false);

  return (
    <div
      className={
        enlarged
          ? "grid min-w-0 grid-cols-1 gap-4"
          : "grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] lg:items-start"
      }
    >
      <section className="motion-rise motion-rise-delay-1 order-2 min-w-0 max-w-full space-y-3 lg:order-1">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
              Wiring picture
            </h2>
            <div className="section-rule w-24" />
          </div>
          <p className="max-w-xl text-xs text-mute sm:text-sm">
            {enlarged
              ? "The parts list and steps are hidden while the picture is big. Turn off Bigger or Full screen to see them again."
              : "The parts list and steps stay next to the picture. Use Bigger or Full screen to hide them."}
          </p>
        </div>
        <WokwiDiagram
          guide={guide}
          enlarged={enlarged}
          onEnlargedChange={setEnlarged}
        />
      </section>

      {!enlarged ? (
        <aside className="motion-rise motion-rise-delay-2 order-1 min-w-0 max-w-full space-y-10 lg:order-2 lg:sticky lg:top-4">
          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
                Parts
              </h2>
              <div className="section-rule w-24" />
            </div>
            <PrepParts parts={guide.parts} />
          </section>

          <ToolsList guide={guide} />

          <SolderChecklist guide={guide} />

          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
                Steps
              </h2>
              <div className="section-rule w-24" />
            </div>
            {orderedSteps.length === 0 ? (
              <p className="text-ink-soft">No steps yet.</p>
            ) : (
              <ol className="space-y-6">
                {orderedSteps.map((step) => (
                  <li key={step.id} className="grid gap-2 sm:grid-cols-[2.5rem_1fr]">
                    <span className="brand-mark text-xl text-copper">
                      {String(step.order).padStart(2, "0")}
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold tracking-tight text-ink">
                        {step.title}
                      </p>
                      <p className="text-sm leading-relaxed text-ink-soft">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {guide.notes.length > 0 ? (
            <section className="space-y-4 pb-4">
              <div className="space-y-2">
                <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
                  Notes
                </h2>
                <div className="section-rule w-24" />
              </div>
              <ul className="space-y-2 text-sm text-ink-soft">
                {guide.notes.map((note) => (
                  <li key={note} className="border-l-2 border-copper/50 pl-4">
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
