import { toolIcon } from "@/components/guide/icons";
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

export function toolsFor(guide: Guide): string[] {
  const extra = hasBreadboard(guide)
    ? "Jumper wires (breadboard wiring needs no soldering)"
    : "Heat-shrink tubing or electrical tape to cover bare joints";
  return [...BASE_TOOLS, extra];
}

/**
 * Tools, the 60-second how-to and the safety note. Flat on purpose: the
 * workspace tab around it supplies the heading and the surface.
 */
export function ToolsList({ guide }: ToolsListProps) {
  const breadboard = hasBreadboard(guide);

  return (
    <section aria-label="Tools you need" className="space-y-4">
      <ul className="grid grid-cols-2 gap-2">
        {toolsFor(guide).map((tool) => {
          const ToolGlyph = toolIcon(tool);
          return (
            <li
              key={tool}
              className="flex min-h-24 flex-col items-start gap-2 rounded-[10px] border border-line bg-white/70 p-3 text-sm leading-snug text-ink"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-flux/10 text-flux">
                <ToolGlyph size={20} />
              </span>
              <span>{tool}</span>
            </li>
          );
        })}
      </ul>

      {breadboard ? (
        <p className="text-sm leading-relaxed text-mute">
          Parts pushed into a breadboard need no soldering. You only need the iron for
          pieces that are not on the breadboard.
        </p>
      ) : null}

      <details className="rounded-[10px] border border-line bg-paper/70 px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink">
          How to solder a joint in 60 seconds
        </summary>
        <ol className="list-decimal space-y-1.5 pb-3 pl-5 text-sm leading-relaxed text-ink-soft">
          {JOINT_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      <p className="rounded-[10px] border border-warn-line bg-warn-bg px-3 py-2.5 text-sm leading-relaxed text-warn-ink">
        Safety: work in a ventilated room, treat the iron as hot at all times and rest it
        in its stand. Never power the build while any wires are touching each other.
      </p>
    </section>
  );
}
