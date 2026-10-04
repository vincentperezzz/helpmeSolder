import { getCatalogPart } from "@/lib/catalog";
import { getGuide } from "@/lib/guides/repository";
import { validateGuide } from "@/lib/guides/validator";

type GuidePageProps = {
  params: Promise<{ id: string }>;
};

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
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
        <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
          HelpmeSolder
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Guide unavailable
        </h1>
        <p className="text-zinc-600">{loadError}</p>
      </main>
    );
  }

  if (!guide) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
        <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
          HelpmeSolder
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Guide not found
        </h1>
        <p className="font-mono text-sm text-zinc-500">{id}</p>
      </main>
    );
  }

  const validation = validateGuide(guide);
  const board = guide.board_id ? getCatalogPart(guide.board_id) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
          HelpmeSolder
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {guide.title || "Untitled guide"}
        </h1>
        <p className="font-mono text-sm text-zinc-500">{guide.id}</p>
        <p className="text-sm text-zinc-600">
          Power: {guide.power_source ?? "not set"}
          {board ? ` · Board: ${board.name}` : null}
        </p>
      </header>

      {!validation.ok ? (
        <section className="space-y-2 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Validation blocked</p>
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

      <section className="space-y-3">
        <h2 className="text-xl font-medium text-zinc-900">Prep / Parts</h2>
        {guide.parts.length === 0 ? (
          <p className="text-zinc-600">No parts yet.</p>
        ) : (
          <ul className="space-y-2">
            {guide.parts.map((part) => {
              const catalog = getCatalogPart(part.catalogId);
              return (
                <li key={part.instanceId} className="text-zinc-700">
                  <span className="font-medium">
                    {part.label || catalog?.name || part.catalogId}
                  </span>
                  <span className="text-zinc-500">
                    {" "}
                    · {part.instanceId}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium text-zinc-900">Wiring Diagram</h2>
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 border border-dashed border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-500">
          <p>Diagram renderer lands in Phase 2.</p>
          <p>{guide.connections.length} connection(s) recorded.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium text-zinc-900">Steps</h2>
        {guide.steps.length === 0 ? (
          <p className="text-zinc-600">No steps yet.</p>
        ) : (
          <ol className="space-y-4">
            {[...guide.steps]
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <li key={step.id} className="space-y-1">
                  <p className="font-medium text-zinc-900">
                    {step.order}. {step.title}
                  </p>
                  <p className="text-zinc-600">{step.body}</p>
                </li>
              ))}
          </ol>
        )}
      </section>

      {guide.notes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-medium text-zinc-900">Notes</h2>
          <ul className="list-disc space-y-1 pl-5 text-zinc-600">
            {guide.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
