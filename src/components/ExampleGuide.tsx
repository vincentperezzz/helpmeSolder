import { AlertIcon, TipIcon } from "@/components/guide/icons";
import { noteKind } from "@/components/guide/model";
import { getCatalogPart } from "@/lib/catalog";
import { partCategory, resolvePartPhoto } from "@/lib/catalog/part-media";
import { EXAMPLE_GUIDE, EXAMPLE_PART_ORDER } from "@/lib/home/example-guide";

const parts = EXAMPLE_PART_ORDER.map((id) => {
  const part = EXAMPLE_GUIDE.parts.find((entry) => entry.instanceId === id);
  const catalog = part ? getCatalogPart(part.catalogId) : undefined;
  return {
    id,
    name: part?.label || catalog?.name || id,
    category: partCategory(catalog),
    src: resolvePartPhoto(catalog?.photoHint),
    alt: catalog?.photoCaption || part?.label || catalog?.name || "Part",
  };
});

const steps = [...EXAMPLE_GUIDE.steps].sort((a, b) => a.order - b.order);

export function ExampleGuide() {
  return (
    <section id="example" className="relative z-10 scroll-mt-20 bg-paper px-6 py-24 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
        <div className="flex max-w-[65ch] flex-col gap-4">
          <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Your finished guide
          </h2>
          <p className="text-lg leading-relaxed text-ink-soft">
            Parts to gather, the order to build them, and the warnings that keep the board safe.
          </p>
        </div>

        <ul className="snippet-frame grid grid-cols-2 gap-px bg-line-strong sm:grid-cols-4">
          {parts.map((part) => (
            <li key={part.id} className="flex flex-col gap-3 bg-paper p-4">
              {part.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={part.src}
                  alt={part.alt}
                  className="aspect-[4/3] w-full border border-line bg-paper-deep object-contain p-3 mix-blend-multiply"
                />
              ) : (
                <span className="aspect-[4/3] w-full border border-line bg-paper-deep" />
              )}
              <span className="text-sm font-semibold leading-snug tracking-tight text-ink">
                {part.name}
              </span>
              <span className="text-sm text-ink-soft">{part.category}</span>
            </li>
          ))}
        </ul>

        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.7fr)]">
          <ol className="flex flex-col gap-8">
            {steps.map((step, index) => (
              <li key={step.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
                <span className="pad self-start" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  {index === 0 ? (
                    <span className="w-fit rounded-full bg-copper-deep px-2.5 py-0.5 text-xs font-bold text-paper">
                      Up next
                    </span>
                  ) : null}
                  <h3 className="font-display text-xl font-bold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="max-w-[65ch] leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <ul className="flex flex-col gap-3">
            {EXAMPLE_GUIDE.notes.map((note) => {
              const warn = noteKind(note) === "heads-up";
              return (
                <li
                  key={note}
                  className={`flex gap-3 rounded-[14px] border p-4 ${
                    warn
                      ? "border-warn-line bg-warn-bg text-warn-ink"
                      : "border-flux/25 bg-flux/[0.07] text-ink"
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${warn ? "text-warn-ink" : "text-flux"}`}>
                    {warn ? <AlertIcon size={20} /> : <TipIcon size={20} />}
                  </span>
                  <p className="text-sm leading-relaxed">{note}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
