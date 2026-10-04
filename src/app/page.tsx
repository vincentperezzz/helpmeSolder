export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
        HelpmeSolder
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
        How-to solder guides for non-EE builders
      </h1>
      <p className="max-w-xl text-lg text-zinc-600">
        Plan in Cursor or Claude. MCP tools write the guide. Open the secret
        link for prep, wiring, and steps.
      </p>
      <p className="text-sm text-zinc-500">
        Health:{" "}
        <a className="underline underline-offset-4" href="/api/health">
          /api/health
        </a>
      </p>
    </main>
  );
}
