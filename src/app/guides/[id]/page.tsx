import { PrepParts } from "@/components/PrepParts";
import { WiringDiagram } from "@/components/WiringDiagram";
import { getCatalogPart } from "@/lib/catalog";
import type { PowerSource } from "@/lib/catalog/types";
import { getGuide } from "@/lib/guides/repository";
import { validateGuide } from "@/lib/guides/validator";

type GuidePageProps = {
  params: Promise<{ id: string }>;
};

function powerLabel(source: PowerSource | null): string {
  if (source === "battery") return "Battery";
  if (source === "usb_wall") return "USB wall";
  return "Not set";
}

function BrandMark() {
  return <p className="brand-mark text-sm tracking-tight text-mute">HelpmeSolder</p>;
}

function StatusPage({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <main className="guide-shell mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <BrandMark />
      <h1 className="brand-mark text-4xl leading-none tracking-tight text-ink">
        {title}
      </h1>
      <p className="text-ink-soft">{detail}</p>
    </main>
  );
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { id } = await params;
  let guide = null;
  let loadError: string | null = null;

  try {
    guide = await getGuide(id);
  } catch {
    loadError = "Could not load guide.";
  }

  if (loadError) {
    return <StatusPage title="Guide unavailable" detail={loadError} />;
  }

  if (!guide) {
    return <StatusPage title="Guide not found" detail={id} />;
  }

  const validation = validateGuide(guide);
  const board = guide.board_id ? getCatalogPart(guide.board_id) : null;
  const orderedSteps = [...guide.steps].sort((a, b) => a.order - b.order);

  return (
    <main className="guide-shell mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-14 sm:px-8">
      <header className="motion-rise space-y-4">
        <BrandMark />
        <h1 className="brand-mark text-[clamp(2.4rem,6vw,3.75rem)] leading-[0.95] tracking-tight text-ink">
          {guide.title || "Untitled guide"}
        </h1>
        <div className="section-rule w-40" />
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-soft">
          <div>
            <dt className="text-mute">Power</dt>
            <dd className="font-medium text-ink">{powerLabel(guide.power_source)}</dd>
          </div>
          {board ? (
            <div>
              <dt className="text-mute">Board</dt>
              <dd className="font-medium text-ink">{board.name}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-mute">Guide id</dt>
            <dd className="font-mono text-xs tracking-wide text-mute">{guide.id}</dd>
          </div>
        </dl>
      </header>

      {!validation.ok ? (
        <section className="motion-rise motion-rise-delay-1 space-y-2 border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          <p className="font-semibold">Validation blocked</p>
          <ul className="list-disc space-y-1 pl-5">
            {validation.issues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>
                {issue.message}
                {issue.alternatives.length > 0
                  ? ` Alternatives: ${issue.alternatives.join(", ")}`
                  : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="motion-rise motion-rise-delay-1 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
            Prep / Parts
          </h2>
          <div className="section-rule w-24" />
        </div>
        <PrepParts parts={guide.parts} />
      </section>

      <section className="motion-rise motion-rise-delay-2 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
            Wiring Diagram
          </h2>
          <div className="section-rule w-24" />
        </div>
        <WiringDiagram guide={guide} />
      </section>

      <section className="motion-rise motion-rise-delay-3 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
            Steps
          </h2>
          <div className="section-rule w-24" />
        </div>
        {orderedSteps.length === 0 ? (
          <p className="text-ink-soft">No steps yet.</p>
        ) : (
          <ol className="space-y-8">
            {orderedSteps.map((step) => (
              <li key={step.id} className="grid gap-2 sm:grid-cols-[3rem_1fr]">
                <span className="brand-mark text-2xl text-copper">
                  {String(step.order).padStart(2, "0")}
                </span>
                <div className="space-y-2">
                  <p className="text-lg font-semibold tracking-tight text-ink">
                    {step.title}
                  </p>
                  <p className="leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {guide.notes.length > 0 ? (
        <section className="space-y-4 pb-8">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
              Notes
            </h2>
            <div className="section-rule w-24" />
          </div>
          <ul className="space-y-2 text-ink-soft">
            {guide.notes.map((note) => (
              <li key={note} className="border-l-2 border-copper/50 pl-4">
                {note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
