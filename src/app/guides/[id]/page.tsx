import { GuideWorkspace } from "@/components/GuideWorkspace";
import { getCatalogPart } from "@/lib/catalog";
import type { PowerSource } from "@/lib/catalog/types";
import { getGuide } from "@/lib/guides/repository";
import { validateGuide } from "@/lib/guides/validator";

type GuidePageProps = {
  params: Promise<{ id: string }>;
};

function powerLabel(source: PowerSource | null): string {
  if (source === "usb_wall") return "USB wall";
  if (source === "battery_9v") return "9V battery";
  if (source === "battery_2aa") return "2×AA holder";
  if (source === "battery_3aa") return "3×AA holder";
  if (source === "battery_18650") return "18650 Li-ion";
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
  const partNames = guide.parts
    .map((part) => getCatalogPart(part.catalogId)?.name)
    .filter((name): name is string => Boolean(name));
  const storyBits = [
    board?.name,
    powerLabel(guide.power_source) !== "Not set"
      ? powerLabel(guide.power_source)
      : null,
    partNames.find((name) => /breadboard/i.test(name)),
    partNames.find((name) => /led/i.test(name)),
    partNames.find((name) => /resistor/i.test(name)),
  ].filter(Boolean);
  const storyLine =
    storyBits.length > 0
      ? `You are building with ${storyBits.join(" · ")}.`
      : "Wire the parts on the diagram, then follow the steps.";

  return (
    <main className="guide-shell mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="motion-rise space-y-3">
        <BrandMark />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <h1 className="brand-mark text-[clamp(2rem,5vw,3.2rem)] leading-[0.95] tracking-tight text-ink">
              {guide.title || "Untitled guide"}
            </h1>
            <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
              {storyLine}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
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
          </dl>
        </div>
        <div className="section-rule w-40" />
      </header>

      {!validation.ok ? (
        <section className="space-y-2 border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
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

      <GuideWorkspace guide={guide} orderedSteps={orderedSteps} />
    </main>
  );
}
