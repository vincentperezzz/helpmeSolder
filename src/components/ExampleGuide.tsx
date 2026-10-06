import { GuidePicture } from "@/components/GuidePicture";

const BENEFIT_CARDS = [
  {
    id: "wires",
    title: "Hover a wire",
    body: "Both pins light up. Names, not schematic symbols.",
  },
  {
    id: "catalog",
    title: "Catalog parts",
    body: "This ESP32, buzzer, button and breadboard. Real pins.",
  },
  {
    id: "order",
    title: "Ordered steps",
    body: "Place, power, then signals. One job at a time.",
  },
  {
    id: "link",
    title: "One secret URL",
    body: "Same picture as the chat. It updates when the plan does.",
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
            Hover a wire to see what it joins.
          </p>
        </div>

        <GuidePicture />

        <ul className="benefit-cards snippet-frame">
          {BENEFIT_CARDS.map((card, index) => (
            <li key={card.id} className="benefit-card">
              <span className="pad" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="font-display text-xl font-bold tracking-tight text-ink">{card.title}</h3>
              <p className="leading-relaxed text-ink-soft">{card.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
