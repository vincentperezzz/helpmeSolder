import type { Guide } from "@/lib/catalog/types";
import { hasBreadboard } from "@/lib/guides/solder-plan";

type ToolsListProps = {
  guide: Guide;
};

const BASE_TOOLS = [
  "Soldering iron",
  "Solder (thin, 0.8 mm is easy to work with)",
  "Wire cutters and strippers",
  "Helping hands or tape to hold parts still",
  "Safety glasses",
];

const JOINT_STEPS = [
  "Hold the wire and the pin together so they touch.",
  "Press the hot iron tip on both the wire and the pin for about 2 seconds.",
  "Touch the solder to the joint, not to the iron. It should flow around both.",
  "Count to two, then lift the solder away and then the iron.",
  "Do not move anything while it cools, about 5 seconds.",
  "A good joint is shiny and shaped like a small cone. Dull or blobby means reheat it.",
];

export function ToolsList({ guide }: ToolsListProps) {
  const breadboard = hasBreadboard(guide);
  const extras = breadboard
    ? ["Jumper wires (breadboard wiring needs no soldering)"]
    : ["Heat-shrink tubing or electrical tape to cover bare joints"];

  return (
    <section
      aria-label="Tools you need"
      className="rounded-2xl border border-line-strong bg-white/70 p-4 sm:p-5"
    >
      <h2 className="font-display text-xl text-ink">Tools you need</h2>
      <ul className="mt-3 grid gap-1.5 text-sm text-ink-soft sm:grid-cols-2">
        {[...BASE_TOOLS, ...extras].map((tool) => (
          <li key={tool} className="flex gap-2">
            <span aria-hidden className="text-copper">+</span>
            <span>{tool}</span>
          </li>
        ))}
      </ul>
      {breadboard ? (
        <p className="mt-3 text-sm text-mute">
          Parts pushed into a breadboard need no soldering. You only need the iron for
          pieces that are not on the breadboard.
        </p>
      ) : null}

      <details className="mt-4 rounded-xl border border-line bg-paper px-3 py-2">
        <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-ink">
          How to solder a joint in 60 seconds
        </summary>
        <ol className="mt-1 list-decimal space-y-1.5 pb-2 pl-5 text-sm text-ink-soft">
          {JOINT_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      <p className="mt-4 rounded-xl border border-warn-line bg-warn-bg px-3 py-2 text-sm text-warn-ink">
        Safety: work in a ventilated room, treat the iron as hot at all times and rest it
        in its stand. Never power the build while any wires are touching each other.
      </p>
    </section>
  );
}
