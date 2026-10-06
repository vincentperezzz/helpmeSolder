import type { Guide, GuideStep } from "@/lib/catalog/types";
import { AlertIcon, TipIcon } from "./icons";
import { noteKind } from "./model";

type StepsPanelProps = { guideId: string; guide: Guide; steps: GuideStep[] };

export function StepsPanel({ steps }: StepsPanelProps) {
  if (steps.length === 0) {
    return <p className="text-sm text-mute">No steps yet.</p>;
  }

  return (
    <ol className="m-0 list-none space-y-4 p-0">
      {steps.map((step) => (
        <li key={step.id} className="flex gap-3">
          <span
            aria-hidden
            className="brand-mark mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-copper bg-white text-sm font-bold text-copper-deep"
          >
            {step.order}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base leading-snug font-bold tracking-tight text-ink">{step.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
              {step.body}
            </p>
          </div>
        </li>
      ))}
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
