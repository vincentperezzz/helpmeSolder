import { AlertIcon, TipIcon } from "@/components/guide/icons";
import { GuidePicture } from "@/components/GuidePicture";
import { InView } from "@/components/InView";

const BENEFIT_CARDS = [
  {
    id: "wires",
    title: "See what each wire joins",
    body: "Hover or tap a jumper. It names both ends in words, so you know which pin to solder without reading a schematic.",
  },
  {
    id: "catalog",
    title: "Parts come from the catalog",
    body: "The ESP32, buzzer, button and breadboard in this picture are real catalog parts. Pins are never invented.",
  },
  {
    id: "order",
    title: "Build in a fixed order",
    body: "The page tells you what to do next: place, power, then signals. You follow the list at the bench.",
  },
  {
    id: "link",
    title: "Keep one secret link",
    body: "Your assistant replies with a URL. Anyone with it sees the same picture. It updates when the plan changes.",
  },
] as const;

const BENEFIT_NOTES = [
  {
    warn: true,
    text: "Chat sketches invent pins. This page only draws pins that exist on the part, so a 3×AA pack goes to VIN and never into the 3V3 pin.",
  },
  {
    warn: false,
    text: "Software notes travel with the wiring. INPUT_PULLUP on the button pin is written here so you do not add a resistor the chip already has.",
  },
] as const;

export function ExampleGuide() {
  return (
    <section id="example" className="relative z-10 scroll-mt-20 bg-paper px-6 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
        <div className="flex max-w-[65ch] flex-col gap-4">
          <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Your finished guide
          </h2>
          <p className="text-lg leading-relaxed text-ink-soft">
            A wiring picture you can interrogate, and a page that stays with you at the bench.
          </p>
        </div>

        <GuidePicture />

        <InView className="trace-scope min-w-0">
          <ul className="benefit-cards">
            {BENEFIT_CARDS.map((card, index) => (
              <li
                key={card.id}
                style={{ "--i": index } as React.CSSProperties}
                className="benefit-card trace-step"
              >
                <span className="pad" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="font-display text-xl font-bold tracking-tight text-ink">{card.title}</h3>
                <p className="leading-relaxed text-ink-soft">{card.body}</p>
              </li>
            ))}
          </ul>
        </InView>

        <ul className="flex max-w-[65ch] flex-col gap-3">
          {BENEFIT_NOTES.map((note) => (
            <li
              key={note.text}
              className={`flex gap-3 rounded-[14px] border p-4 ${
                note.warn
                  ? "border-warn-line bg-warn-bg text-warn-ink"
                  : "border-flux/25 bg-flux/[0.07] text-ink"
              }`}
            >
              <span className={`mt-0.5 shrink-0 ${note.warn ? "text-warn-ink" : "text-flux"}`}>
                {note.warn ? <AlertIcon size={20} /> : <TipIcon size={20} />}
              </span>
              <p className="text-sm leading-relaxed">{note.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
