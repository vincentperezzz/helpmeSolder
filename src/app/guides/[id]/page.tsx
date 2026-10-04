type GuidePageProps = {
  params: Promise<{ id: string }>;
};

export default async function GuidePage({ params }: GuidePageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
          HelpmeSolder
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Guide
        </h1>
        <p className="font-mono text-sm text-zinc-500">{id}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-medium text-zinc-900">Prep / Parts</h2>
        <p className="text-zinc-600">Waiting for guide data.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium text-zinc-900">Wiring Diagram</h2>
        <div className="flex min-h-48 items-center justify-center border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
          Diagram placeholder
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium text-zinc-900">Steps</h2>
        <p className="text-zinc-600">Waiting for guide data.</p>
      </section>
    </main>
  );
}
