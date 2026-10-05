import Link from "next/link";
import type { AssetRecord } from "@/lib/catalog/asset-registry";
import {
  ASSET_SHOWS,
  assetsHref,
  badgesFor,
  categoriesOf,
  drawingLabel,
  filterRecords,
  genericUsage,
  summarize,
  thumbnailFilePath,
  type AssetBadge,
  type AssetFilter,
  type AssetView,
} from "@/lib/admin/asset-view";
import { Section, Tile, Tiles } from "../../_components/ui";

const TONES: Record<AssetBadge["tone"], string> = {
  ok: "border-flux/40 bg-flux/10 text-flux",
  info: "border-line-strong bg-paper-deep text-ink",
  warn: "border-warn-line bg-warn-bg text-warn-ink",
  bad: "border-copper/50 bg-copper/10 text-copper-deep",
};

function Badge({ badge }: { badge: AssetBadge }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[badge.tone]}`}>
      {badge.label}
    </span>
  );
}

function ImageTile({ src, alt, label }: { src: string | null; alt: string; label: string }) {
  return (
    <figure className="m-0 min-w-0 flex-1">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-line bg-paper-deep/60 p-1">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-xs font-medium text-copper-deep">No image</span>
        )}
      </div>
      <figcaption className="mt-1 text-xs text-mute">{label}</figcaption>
    </figure>
  );
}

function PartRow({ r }: { r: AssetRecord }) {
  const path = thumbnailFilePath(r.thumbnailUrl);
  return (
    <li className="rounded-md border border-line bg-white/60 p-3 md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-4">
      <div className="flex gap-3">
        <ImageTile src={r.thumbnailUrl} alt={`${r.name} thumbnail`} label="Parts-tab thumbnail" />
        {r.drawingUrl ? (
          <ImageTile src={r.drawingUrl} alt={`${r.name} diagram drawing`} label="Diagram drawing" />
        ) : (
          <figure className="m-0 min-w-0 flex-1">
            <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-line-strong p-2">
              <span className="rounded-full bg-paper-deep px-2 py-1 text-center text-xs text-ink-soft [overflow-wrap:anywhere]">
                {drawingLabel(r)}
              </span>
            </div>
            <figcaption className="mt-1 text-xs text-mute">Diagram drawing</figcaption>
          </figure>
        )}
      </div>
      <div className="mt-3 md:hidden" />
      <div className="min-w-0 md:mt-0"><div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink [overflow-wrap:anywhere]">{r.name}</h3>
          <p className="text-xs text-mute [overflow-wrap:anywhere]">
            {r.partId} · {r.category}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {badgesFor(r).map((b) => (
            <Badge key={b.label} badge={b} />
          ))}
        </div>
      </div>
      <dl className="mt-2 space-y-1 text-xs text-ink-soft">
        <div>
          <dt className="inline text-mute">Licence: </dt>
          <dd className="inline">{r.license ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="inline text-mute">Thumbnail file: </dt>
          <dd className="inline font-mono [overflow-wrap:anywhere]">{path ?? "None"}</dd>
        </div>
        {r.genericRef ? (
          <div>
            <dt className="inline text-mute">Stand-in: </dt>
            <dd className="inline font-mono">{r.genericRef}</dd>
          </div>
        ) : null}
      </dl>
      {r.issues.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-warn-ink">
          {r.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      </div>
    </li>
  );
}

function GridTile({ r }: { r: AssetRecord }) {
  const path = thumbnailFilePath(r.thumbnailUrl);
  return (
    <li className="min-w-0 rounded-md border border-line bg-white/60 p-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-line bg-paper-deep/60 p-1">
        {r.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.thumbnailUrl} alt={`${r.name} thumbnail`} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs font-medium text-copper-deep">No image</span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-ink [overflow-wrap:anywhere]">{r.name}</h3>
      <div className="mt-1 flex flex-wrap gap-1">
        {badgesFor(r).map((b) => (
          <Badge key={b.label} badge={b} />
        ))}
      </div>
      <details className="mt-2 text-xs text-ink-soft">
        <summary className="flex min-h-11 cursor-pointer items-center text-mute">
          Details{r.issues.length > 0 ? ` (${r.issues.length} to fix)` : ""}
        </summary>
        <div className="space-y-2 pb-1">
          <p className="text-mute [overflow-wrap:anywhere]">
            {r.partId} · {r.category}
          </p>
          <p>Diagram: {drawingLabel(r)}</p>
          {r.drawingUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.drawingUrl} alt={`${r.name} diagram drawing`} loading="lazy" className="h-20 w-full rounded-md border border-line bg-paper-deep/60 object-contain" />
          ) : null}
          <p>Licence: {r.license ?? "Not recorded"}</p>
          <p className="font-mono [overflow-wrap:anywhere]">{path ?? "No thumbnail file"}</p>
          {r.issues.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4 text-warn-ink">
              {r.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>
    </li>
  );
}

function ViewToggle({ filter }: { filter: AssetFilter }) {
  const options: { id: AssetView; label: string; icon: string }[] = [
    { id: "grid", label: "Grid", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
    { id: "list", label: "List", icon: "M3 5h18M3 12h18M3 19h18" },
  ];
  return (
    <div role="group" aria-label="Layout" className="flex gap-1">
      {options.map((o) => (
        <Link
          key={o.id}
          href={assetsHref({ ...filter, view: o.id })}
          aria-pressed={filter.view === o.id}
          className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${
            filter.view === o.id
              ? "border-copper bg-copper/10 font-semibold text-ink"
              : "border-line-strong text-ink-soft hover:bg-paper-deep"
          }`}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d={o.icon} />
          </svg>
          {o.label}
        </Link>
      ))}
    </div>
  );
}

const CONTROL ="min-h-11 rounded-md border border-line-strong bg-white px-3 text-sm text-ink";

/** Everything on the Assets tab. Pure and server-rendered: filters are plain links and a GET form. */
export function AssetsView({ records, filter }: { records: AssetRecord[]; filter: AssetFilter }) {
  const s = summarize(records);
  const generics = genericUsage(records);
  const categories = categoriesOf(records);
  const shown = filterRecords(records, filter);

  return (
    <>
      <Tiles>
        <Tile label="Parts" value={s.parts} />
        <Tile label="With a real photo" value={s.withPhoto} />
        <Tile label="With our illustration" value={s.withIllustration} />
        <Tile label="Using a generic stand-in" value={s.generic} />
        <Tile label="Missing a thumbnail" value={s.missing} />
        <Tile label="Diagram drawn by generic skeleton" value={s.skeletonDrawings} />
      </Tiles>

      <Section title="What we use for generics">
        {generics.length === 0 ? (
          <p className="text-sm text-ink-soft">No part relies on a generic stand-in.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {generics.map((g) => (
              <li key={g.ref} className="flex gap-3 rounded-md border border-line bg-white/60 p-3">
                <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-paper-deep/60 p-1">
                  {g.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.previewUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-center text-xs text-mute">No image</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink [overflow-wrap:anywhere]">{g.ref}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Used by {g.count} {g.count === 1 ? "part" : "parts"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Every part">
        <form method="get" action="/admin/assets" className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-mute">
            Search
            <input
              type="search"
              name="q"
              defaultValue={filter.q}
              placeholder="Part name or id"
              className={CONTROL}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-mute">
            Type
            <select name="cat" defaultValue={filter.cat} className={CONTROL}>
              <option value="">All types</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="show" value={filter.show} />
          <input type="hidden" name="view" value={filter.view} />
          <button type="submit" className="min-h-11 rounded-md bg-ink px-4 text-sm font-medium text-paper">
            Apply
          </button>
        </form>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Show" className="flex flex-wrap gap-2">
          {ASSET_SHOWS.map((o) => {
            const current = o.id === filter.show;
            return (
              <Link
                key={o.id}
                href={assetsHref({ ...filter, show: o.id })}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full border px-3 text-sm ${
                  current
                    ? "border-copper bg-copper/10 font-semibold text-ink"
                    : "border-line-strong text-ink-soft hover:bg-paper-deep"
                }`}
              >
                {o.label}
              </Link>
            );
          })}
        </nav>
        <ViewToggle filter={filter} />
        </div>
        <p className="mb-3 text-xs text-mute" aria-live="polite">
          Showing {shown.length} of {records.length} parts
        </p>
        {shown.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No parts match.{" "}
            <Link href="/admin/assets" className="underline">
              Clear filters
            </Link>
          </p>
        ) : (
          <ul className={filter.view === "list" ? "space-y-3" : "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"}>
            {shown.map((r) => (
              filter.view === "list" ? <PartRow key={r.partId} r={r} /> : <GridTile key={r.partId} r={r} />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
