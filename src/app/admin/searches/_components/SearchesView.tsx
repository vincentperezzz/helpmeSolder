import Link from "next/link";
import type { ReactNode } from "react";
import {
  NOTE_MAX,
  SOURCE_CHIPS,
  SOURCE_FILTER_LABELS,
  SOURCE_LABELS,
  VIEW_CHIPS,
  VIEW_LABELS,
  bestMatchName,
  countBySource,
  countByView,
  demandBarPercent,
  filterBySource,
  filterByView,
  isNoMatch,
  lastSeenText,
  outcomeText,
  rawSearchesText,
  searchTotals,
  searchedText,
  searchesHref,
  type CatalogSearch,
  type SearchView,
  type SourceFilter,
} from "@/lib/admin/searches";

type Action = (formData: FormData) => void | Promise<void>;

export type SearchesViewActions = {
  setStatus: Action;
  setNote: Action;
  addToRequests: Action;
};

export type SearchesViewProps = {
  /** Every search, already sorted (new first, then demand, then last seen). */
  searches: CatalogSearch[];
  active: { view: SearchView; source: SourceFilter };
  message?: { ok: boolean; text: string; link?: { href: string; label: string } };
  capped?: boolean;
  now: number;
  /** Catalog id to display name, for the best match. A missing id shows nothing. */
  partNames: Record<string, string>;
  actions: SearchesViewActions;
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux";
const BTN = `inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-ink hover:bg-paper-deep ${FOCUS}`;
const BTN_PRIMARY = `inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-soft ${FOCUS}`;
const CONTROL = `min-h-11 min-w-0 rounded-md border border-line-strong bg-white px-3 text-sm text-ink ${FOCUS}`;

export function SearchesView(props: SearchesViewProps) {
  const { searches, active, message, capped } = props;
  const totals = searchTotals(searches);
  // Each chip count respects the other filter, so the numbers match what you will see.
  const bySource = filterBySource(searches, active.source);
  const viewCounts = countByView(bySource);
  const byView = filterByView(searches, active.view);
  const sourceCounts = countBySource(byView);
  const visible = filterBySource(byView, active.source);
  const maxDemand = visible.reduce((m, r) => Math.max(m, r.demand), 0);

  return (
    <div className="space-y-6">
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-md border border-line bg-white/60 p-3 text-sm ${
            message.ok ? "text-ink" : "text-warn-ink"
          }`}
        >
          {message.text}
          {message.link ? (
            <>
              {" "}
              <Link href={message.link.href} className={`font-medium text-ink underline ${FOCUS}`}>
                {message.link.label}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <p className="max-w-prose text-base text-ink-soft">
        What AI assistants searched our catalog for. Searches with no match show what they could not
        find.
      </p>

      {searches.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-white/50 p-6">
          <h2 className="font-display text-lg font-bold text-ink">No searches yet</h2>
          <p className="mt-2 max-w-prose text-sm text-ink-soft">
            No searches yet. When an AI assistant searches the catalog, for example for a battery or
            a sensor, it shows up here.
          </p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Searches" value={totals.searches} />
            <Stat label="With no match" value={totals.noMatch} accent />
            <Stat label="Waiting" value={totals.waiting} />
          </dl>
          {capped ? (
            <p className="text-sm text-warn-ink">Only the first 5,000 searches are shown.</p>
          ) : null}

          <div className="space-y-3">
            <ChipNav label="Filter by outcome">
              {VIEW_CHIPS.map((v) => (
                <Chip
                  key={v}
                  href={searchesHref(v, active.source)}
                  current={v === active.view}
                  text={VIEW_LABELS[v]}
                  count={viewCounts[v]}
                />
              ))}
            </ChipNav>
            <ChipNav label="Filter by source">
              {SOURCE_CHIPS.map((s) => (
                <Chip
                  key={s}
                  href={searchesHref(active.view, s)}
                  current={s === active.source}
                  text={SOURCE_FILTER_LABELS[s]}
                  count={sourceCounts[s]}
                />
              ))}
            </ChipNav>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing here.{" "}
              <Link href="/admin/searches" className={`font-medium text-ink underline ${FOCUS}`}>
                Clear the filters
              </Link>
              .
            </p>
          ) : (
            <ol className="space-y-3">
              {visible.map((row, i) => (
                <SearchRow key={row.key} row={row} rank={i + 1} maxDemand={maxDemand} props={props} />
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-md border bg-white/60 p-3 ${accent ? "border-copper" : "border-line"}`}>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold sm:text-3xl ${accent ? "text-copper-deep" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}

function ChipNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </nav>
  );
}

function Chip({
  href,
  current,
  text,
  count,
}: {
  href: string;
  current: boolean;
  text: string;
  count: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm ${FOCUS} ${
          current
            ? "border-copper bg-copper font-semibold text-white"
            : "border-line-strong text-ink hover:bg-paper-deep"
        }`}
      >
        {text}
        <span className={current ? "text-white/85" : "text-mute"}>({count})</span>
      </Link>
    </li>
  );
}

function HiddenFields({ row, props }: { row: CatalogSearch; props: SearchesViewProps }) {
  return (
    <>
      <input type="hidden" name="key" value={row.key} />
      <input type="hidden" name="back" value={props.active.view} />
      <input type="hidden" name="backSource" value={props.active.source} />
    </>
  );
}

function StatusButton({
  row,
  props,
  status,
  label,
}: {
  row: CatalogSearch;
  props: SearchesViewProps;
  status: "new" | "handled" | "ignored";
  label: string;
}) {
  return (
    <form action={props.actions.setStatus}>
      <HiddenFields row={row} props={props} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={BTN}>
        {label}
      </button>
    </form>
  );
}

function SearchRow({
  row,
  rank,
  maxDemand,
  props,
}: {
  row: CatalogSearch;
  rank: number;
  maxDemand: number;
  props: SearchesViewProps;
}) {
  const { now, partNames, actions } = props;
  const uid = row.key.replace(/[^a-zA-Z0-9_-]/g, "_");
  const noMatch = isNoMatch(row);
  const done = row.status !== "new";
  const searched = searchedText(row.demand);
  const raw = rawSearchesText(row.demand, row.searches);
  const matchName = noMatch ? null : bestMatchName(row.top_match_id, (id) => partNames[id]);

  return (
    <li
      className={`rounded-md border p-4 ${
        done ? "border-line bg-white/30" : "border-line-strong bg-white/70"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-label={`Number ${rank}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper-deep text-sm font-semibold text-ink"
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`min-w-0 break-words font-display text-xl font-bold ${
              done ? "text-ink-soft" : "text-ink"
            }`}
          >
            &ldquo;{row.query}&rdquo;
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft">
              {SOURCE_LABELS[row.source] ?? row.source}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                noMatch ? "border-copper bg-copper/10 text-copper-deep" : "border-flux bg-flux/10 text-flux"
              }`}
            >
              {outcomeText(row.last_result_count)}
            </span>
            {matchName ? (
              <span className="min-w-0 break-words text-sm text-ink-soft">Best match: {matchName}</span>
            ) : null}
            {row.status === "handled" ? (
              <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink">
                Handled
              </span>
            ) : null}
            {row.status === "ignored" ? (
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-mute">
                Ignored
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div
              role="img"
              aria-label={searched}
              className="h-2 w-full max-w-48 overflow-hidden rounded-full bg-paper-deep"
            >
              <div
                className={`h-full rounded-full ${done ? "bg-mute" : "bg-copper"}`}
                style={{ width: `${demandBarPercent(row.demand, maxDemand)}%` }}
              />
            </div>
            <p className="text-sm text-ink">
              <span className="font-semibold">{searched}</span>
              {raw ? <span className="text-mute"> ({raw})</span> : null}
            </p>
          </div>
          <p className="mt-1 text-sm text-mute">{lastSeenText(row.last_seen, now)}.</p>

          {row.admin_note ? (
            <p className="mt-1 break-words text-sm text-ink">
              <span className="text-mute">Your note: </span>
              {row.admin_note}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {done ? (
              <StatusButton row={row} props={props} status="new" label="Undo" />
            ) : (
              <>
                {noMatch ? (
                  <form action={actions.addToRequests}>
                    <HiddenFields row={row} props={props} />
                    <button type="submit" className={BTN_PRIMARY}>
                      Add to requests
                    </button>
                  </form>
                ) : null}
                <StatusButton row={row} props={props} status="handled" label="Mark handled" />
                <StatusButton row={row} props={props} status="ignored" label="Ignore" />
              </>
            )}
          </div>

          <details className="mt-3">
            <summary
              className={`flex min-h-11 w-fit cursor-pointer items-center rounded-md px-1 text-sm font-medium text-ink-soft underline ${FOCUS}`}
            >
              More options
            </summary>
            <div className="mt-2 rounded-md border border-line bg-white/60 p-3">
              <form action={actions.setNote} className="flex flex-wrap items-center gap-2">
                <HiddenFields row={row} props={props} />
                <label htmlFor={`note-${uid}`} className="w-full text-xs text-mute sm:w-auto">
                  Your note
                </label>
                <input
                  id={`note-${uid}`}
                  name="note"
                  type="text"
                  maxLength={NOTE_MAX}
                  defaultValue={row.admin_note ?? ""}
                  className={`${CONTROL} flex-1`}
                />
                <button type="submit" className={BTN_PRIMARY}>
                  Save note
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </li>
  );
}
