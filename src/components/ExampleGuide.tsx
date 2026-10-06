import { GuidePicture } from "@/components/GuidePicture";
import { InView } from "@/components/InView";
import { EXAMPLE_GUIDE } from "@/lib/home/example-guide";

export function ExampleGuide() {
  const steps = [...EXAMPLE_GUIDE.steps].sort((a, b) => a.order - b.order);

  return (
    <section
      id="example"
      className="relative z-10 scroll-mt-20 bg-paper px-6 py-24 sm:px-10 lg:px-16"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
        <div className="flex max-w-[60ch] flex-col gap-4">
          <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            A real guide, wire by wire
          </h2>
          <p className="text-lg leading-relaxed text-ink-soft">
            An ESP32 that sounds a buzzer when you press a button. Point at a
            wire to see both ends.
          </p>
        </div>

        <GuidePicture />

        <InView className="trace-scope min-w-0">
          <ol className="step-strip">
            <span aria-hidden="true" className="trace-rail-h hidden lg:block" />
            <span aria-hidden="true" className="trace-rail lg:hidden" />
            {steps.map((step, index) => (
              <li
                key={step.id}
                style={{ "--i": index } as React.CSSProperties}
                className="trace-step step-strip__item"
              >
                <span aria-hidden="true" className="pad">
                  {step.order}
                </span>
                <p className="step-strip__title">{step.title}</p>
              </li>
            ))}
          </ol>
        </InView>
      </div>
    </section>
  );
}
