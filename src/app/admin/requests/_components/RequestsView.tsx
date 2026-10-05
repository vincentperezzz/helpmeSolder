import Link from "next/link";
import type { ReactNode } from "react";
import {
  KIND_GROUPS,
  KIND_LABELS,
  NOTE_MAX,
  REQUEST_STATUSES,
  STATUS_LABELS,
  askedText,
  callsText,
  demandBarPercent,
  filterByKind,
  filterByStatus,
  kindGroup,
  relativeTime,
  requestTotals,
  sourceSentence,
  type KindFilter,
  type PartRequest,
  type RequestStatus,
  type StatusFilter,
} from "@/lib/admin/requests";

type Action = (formData: FormData) => void | Promise<void>;

export type RequestsViewActions = {
  setStatus: Action;
  setAlias: Action;
  removeAlias: Action;
  setNote: Action;
};

export type CatalogGroup = { label: string; parts: { id: string; name: string }[] };

export type RequestsViewProps = {
  /** Every request, already sorted (waiting first, then demand, then last seen). */
  requests: PartRequest[];
  active: { status: StatusFilter; kind: KindFilter };
  message?: { ok: boolean; text: string };
  capped?: boolean;
  now: number;
  catalogGroups: CatalogGroup[];
  /** Catalog id to display name, for suggestions and aliases. */
  partNames: Record<string, string>;
  actions: RequestsViewActions;
};

const STATUS_CHIPS: StatusFilter[] = ["all", ...REQUEST_STATUSES];
const KIND_CHIPS: KindFilter[] = ["all", ...KIND_GROUPS];

const PILL: Record<RequestStatus, string> = {
  new: "border-copper bg-copper/10 text-copper-deep",
  planned: "border-line-strong text-ink",
  building: "border-line-strong text-ink",
  shipped: "border-flux bg-flux/10 text-flux",
  rejected: "border-line text-mute",
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux";
const BTN = `inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-ink hover:bg-paper-deep ${FOCUS}`;
const BTN_PRIMARY = `inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-soft ${FOCUS}`;
const CONTROL = `min-h-11 min-w-0 rounded-md border border-line-strong bg-white px-3 text-sm text-ink ${FOCUS}`;

export function requestsHref(status: StatusFilter, kind: KindFilter): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (kind !== "all") params.set("kind", kind);
  const query = params.toString();
  return query ? `/admin/requests?${query}` : "/admin/requests";
}

export function RequestsView(props: RequestsViewProps) {
  const { requests, active, message, capped } = props;
  const totals = requestTotals(requests);
  // Each chip count respects the other filter, so the numbers match what you will see.
  const byKind = filterByKind(requests, active.kind);
  const byStatus = filterByStatus(requests, active.status);
  const visible = filterByKind(byStatus, active.kind);
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
        </p>
      ) : null}

      <header className="space-y-3">
        <p className="max-w-prose text-base text-ink-soft">
          Parts an AI assistant asked for that we do not have yet. They are noted here
          automatically. Decide what to do with each one.
        </p>
        <ol aria-label="How it works" className="grid gap-2 text-sm text-ink-soft sm:grid-cols-3">
          {[
            "An assistant asks for a part we do not have.",
            "It is noted here and the assistant tells the user it is not supported yet.",
            "You decide: add it, say it is the same as a part we have, or reject it.",
          ].map((text, i) => (
            <li key={i} className="flex gap-2 rounded-md border border-line bg-white/50 p-2.5">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper"
              >
                {i + 1}
              </span>
              <span className="min-w-0">{text}</span>
            </li>
          ))}
        </ol>
      </header>

      {requests.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-white/50 p-6">
          <h2 className="font-display text-lg font-bold text-ink">No requests yet</h2>
          <p className="mt-2 max-w-prose text-sm text-ink-soft">
            When an AI assistant asks for a part we do not have, it shows up here so you can
            decide what to do. For example, if someone asks an assistant to build with a CR2032
            coin cell or a BME280 sensor, it shows up here.
          </p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Waiting for a decision" value={totals.waiting} accent />
            <Stat label="In progress" value={totals.inProgress} />
            <Stat label="Added" value={totals.added} />
            <Stat label="Total asks" value={totals.totalAsks} />
          </dl>
          {capped ? (
            <p className="text-sm text-warn-ink">Only the first 5,000 requests are shown.</p>
          ) : null}

          <div className="space-y-3">
            <ChipNav label="Filter by status">
              {STATUS_CHIPS.map((f) => (
                <Chip
                  key={f}
                  href={requestsHref(f, active.kind)}
                  current={f === active.status}
                  text={f === "all" ? "All" : STATUS_LABELS[f]}
                  count={filterByStatus(byKind, f).length}
                />
              ))}
            </ChipNav>
            <ChipNav label="Filter by kind">
              {KIND_CHIPS.map((f) => (
                <Chip
                  key={f}
                  href={requestsHref(active.status, f)}
                  current={f === active.kind}
                  text={KIND_LABELS[f]}
                  count={filterByKind(byStatus, f).length}
                />
              ))}
            </ChipNav>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing here.{" "}
              <Link href="/admin/requests" className={`font-medium text-ink underline ${FOCUS}`}>
                Clear the filters
              </Link>
              .
            </p>
          ) : (
            <ol className="space-y-3">
              {visible.map((req, i) => (
                <RequestRow key={req.key} req={req} rank={i + 1} maxDemand={maxDemand} props={props} />
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
      <dd className={`mt-1 text-3xl font-semibold ${accent ? "text-copper-deep" : "text-ink"}`}>
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

function HiddenFields({ req, props }: { req: PartRequest; props: RequestsViewProps }) {
  return (
    <>
      <input type="hidden" name="key" value={req.key} />
      <input type="hidden" name="back" value={props.active.status} />
      <input type="hidden" name="backKind" value={props.active.kind} />
    </>
  );
}

function StatusButton({
  req,
  props,
  status,
  label,
}: {
  req: PartRequest;
  props: RequestsViewProps;
  status: RequestStatus;
  label: string;
}) {
  return (
    <form action={props.actions.setStatus}>
      <HiddenFields req={req} props={props} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={BTN}>
        {label}
      </button>
    </form>
  );
}

function RequestRow({
  req,
  rank,
  maxDemand,
  props,
}: {
  req: PartRequest;
  rank: number;
  maxDemand: number;
  props: RequestsViewProps;
}) {
  const { now, partNames, actions, catalogGroups } = props;
  const uid = req.key.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pins = (Array.isArray(req.example_pins) ? req.example_pins : [])
    .map((p) => (typeof p?.label === "string" && p.label.trim() ? p.label.trim() : p?.id))
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  const shownPins = pins.slice(0, 12);
  const suggestedName = req.suggested_catalog_id
    ? (partNames[req.suggested_catalog_id] ?? "a supported part")
    : null;
  const mappedName = req.mapped_catalog_id
    ? (partNames[req.mapped_catalog_id] ?? "a supported part")
    : null;
  const done = req.status === "shipped" || req.status === "rejected";
  const calls = callsText(req.demand, req.calls);
  const asked = askedText(req.demand);

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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3
              className={`min-w-0 break-words font-display text-xl font-bold ${
                done ? "text-ink-soft" : "text-ink"
              }`}
            >
              {req.display_name}
            </h3>
            <span className="rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft">
              {KIND_LABELS[kindGroup(req.kind)]}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${PILL[req.status] ?? ""}`}
            >
              {STATUS_LABELS[req.status] ?? req.status}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div
              role="img"
              aria-label={asked}
              className="h-2 w-full max-w-48 overflow-hidden rounded-full bg-paper-deep"
            >
              <div
                className={`h-full rounded-full ${done ? "bg-mute" : "bg-copper"}`}
                style={{ width: `${demandBarPercent(req.demand, maxDemand)}%` }}
              />
            </div>
            <p className="text-sm text-ink">
              <span className="font-semibold">{asked}</span>
              {calls ? <span className="text-mute"> ({calls})</span> : null}
            </p>
          </div>
          <p className="mt-1 text-sm text-mute">
            Last seen {relativeTime(req.last_seen, now)}. {sourceSentence(req.source)}.
          </p>

          {shownPins.length > 0 ? (
            <ul aria-label="Pins the assistant listed" className="mt-2 flex flex-wrap gap-1.5">
              {shownPins.map((pin, i) => (
                <li
                  key={`${pin}-${i}`}
                  className="rounded border border-line bg-paper-deep/60 px-1.5 py-0.5 text-xs text-ink"
                >
                  {pin}
                </li>
              ))}
              {pins.length > shownPins.length ? (
                <li className="px-1 py-0.5 text-xs text-mute">
                  and {pins.length - shownPins.length} more
                </li>
              ) : null}
            </ul>
          ) : null}

          {req.note ? (
            <blockquote className="mt-2 break-words border-l-2 border-line-strong pl-3 text-sm italic text-ink-soft">
              {req.note}
            </blockquote>
          ) : null}

          {mappedName ? (
            <p className="mt-2 text-sm text-ink">
              <span className="text-mute">Treated as </span>
              <span className="font-medium">{mappedName}</span>
            </p>
          ) : null}
          {req.admin_note ? (
            <p className="mt-1 break-words text-sm text-ink">
              <span className="text-mute">Your note: </span>
              {req.admin_note}
            </p>
          ) : null}

          {suggestedName && req.suggested_catalog_id && !req.mapped_catalog_id ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-flux/40 bg-flux/5 p-3">
              <p className="min-w-0 flex-1 text-sm text-ink">
                Maybe the same as <span className="font-semibold">{suggestedName}</span>
              </p>
              <form action={actions.setAlias}>
                <HiddenFields req={req} props={props} />
                <input type="hidden" name="catalogId" value={req.suggested_catalog_id} />
                <button type="submit" className={BTN_PRIMARY}>
                  It is the same
                </button>
              </form>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {done ? (
              <StatusButton req={req} props={props} status="new" label="Undo" />
            ) : (
              <>
                <StatusButton req={req} props={props} status="planned" label="Plan it" />
                <StatusButton req={req} props={props} status="building" label="Start building" />
                <StatusButton req={req} props={props} status="rejected" label="Reject" />
              </>
            )}
          </div>

          <details className="mt-3">
            <summary
              className={`flex min-h-11 w-fit cursor-pointer items-center rounded-md px-1 text-sm font-medium text-ink-soft underline ${FOCUS}`}
            >
              More options
            </summary>
            <div className="mt-2 space-y-3 rounded-md border border-line bg-white/60 p-3">
              <form action={actions.setStatus} className="flex flex-wrap items-center gap-2">
                <HiddenFields req={req} props={props} />
                <label htmlFor={`status-${uid}`} className="w-full text-xs text-mute sm:w-auto">
                  Status
                </label>
                <select
                  id={`status-${uid}`}
                  name="status"
                  defaultValue={req.status}
                  className={`${CONTROL} flex-1 sm:flex-none`}
                >
                  {REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button type="submit" className={BTN_PRIMARY}>
                  Save
                </button>
              </form>

              <form action={actions.setAlias} className="flex flex-wrap items-center gap-2">
                <HiddenFields req={req} props={props} />
                <label htmlFor={`alias-${uid}`} className="w-full text-xs text-mute sm:w-auto">
                  Treat as an existing part
                </label>
                <select
                  id={`alias-${uid}`}
                  name="catalogId"
                  defaultValue={req.mapped_catalog_id ?? req.suggested_catalog_id ?? ""}
                  className={`${CONTROL} flex-1`}
                >
                  <option value="" disabled>
                    Choose a part
                  </option>
                  {catalogGroups.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button type="submit" className={BTN_PRIMARY}>
                  Use this part
                </button>
              </form>
              {req.mapped_catalog_id ? (
                <form action={actions.removeAlias}>
                  <HiddenFields req={req} props={props} />
                  <button type="submit" className={BTN}>
                    Remove alias
                  </button>
                </form>
              ) : null}

              <form action={actions.setNote} className="flex flex-wrap items-center gap-2">
                <HiddenFields req={req} props={props} />
                <label htmlFor={`note-${uid}`} className="w-full text-xs text-mute sm:w-auto">
                  Your note
                </label>
                <input
                  id={`note-${uid}`}
                  name="note"
                  type="text"
                  maxLength={NOTE_MAX}
                  defaultValue={req.admin_note ?? ""}
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
