import Link from "next/link";
import { getCatalogPart, listCatalog } from "@/lib/catalog";
import {
  REQUEST_STATUSES,
  STATUS_LABELS,
  countByStatus,
  filterByStatus,
  loadRequests,
  parseStatusFilter,
  pinSummary,
  relativeTime,
  summarizeRequests,
  summaryText,
  NOTE_MAX,
  type PartRequest,
  type StatusFilter,
} from "@/lib/admin/requests";
import { guardAdmin } from "../_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "../_components/meta";
import { AdminShell } from "../_components/shell";
import {
  removeRequestAliasAction,
  setRequestAliasAction,
  setRequestNoteAction,
  setRequestStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("Admin requests");

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  "status-saved": { ok: true, text: "Status saved." },
  "alias-saved": { ok: true, text: "Saved. Future requests with this name will use that part." },
  "alias-removed": { ok: true, text: "Alias removed." },
  "note-saved": { ok: true, text: "Note saved." },
  "bad-status": { ok: false, text: "That status is not one of the allowed choices." },
  "bad-part": { ok: false, text: "Pick a part from the list." },
  "bad-note": { ok: false, text: `Keep the note to ${NOTE_MAX} characters or fewer.` },
  "bad-request": { ok: false, text: "That request could not be found." },
  "not-found": { ok: false, text: "That request no longer exists." },
  "no-table": {
    ok: false,
    text: "Not tracking yet. Run supabase/migrations/0005_part_requests.sql in the Supabase SQL editor.",
  },
  failed: { ok: false, text: "Could not save that change. Try again in a moment." },
};

const PILL: Record<string, string> = {
  new: "border-copper text-copper-deep",
  planned: "border-line-strong text-ink",
  building: "border-line-strong text-ink",
  shipped: "border-flux text-flux",
  rejected: "border-line text-mute",
};

const FILTERS: StatusFilter[] = ["all", ...REQUEST_STATUSES];

type PageProps = { searchParams: Promise<{ status?: string; msg?: string }> };

function nowMs(): number {
  return Date.now();
}

function filterHref(filter: StatusFilter): string {
  return filter === "all" ? "/admin/requests" : `/admin/requests?status=${filter}`;
}

function catalogGroups() {
  const catalog = listCatalog();
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  return [
    { label: "Boards", parts: [...catalog.boards].sort(byName) },
    { label: "Modules and sensors", parts: [...catalog.modules].sort(byName) },
    { label: "Basic parts", parts: [...catalog.passives].sort(byName) },
  ];
}

export default async function AdminRequestsPage({ searchParams }: PageProps) {
  const guard = await guardAdmin("dashboard");
  if (guard.kind !== "ok") {
    return (
      <main className="mx-auto w-full max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Admin</h1>
        <p role="alert" className="mt-4 text-sm text-warn-ink">
          {UNAVAILABLE_TEXT}
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const filter = parseStatusFilter(params.status);
  const message = params.msg ? MESSAGES[params.msg] : undefined;
  const load = await loadRequests();
  const now = nowMs();

  return (
    <AdminShell session={guard.session} active="requests" title="Requests">
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mb-4 rounded-md border border-line bg-white/60 p-3 text-sm ${
            message.ok ? "text-ink" : "text-warn-ink"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {load.kind === "missing" ? (
        <p className="text-sm text-ink-soft">
          Not tracking yet. Run supabase/migrations/0005_part_requests.sql in the Supabase SQL
          editor.
        </p>
      ) : load.kind === "error" ? (
        <p role="alert" className="text-sm text-warn-ink">
          Could not read requests from the database. Try again in a moment.
        </p>
      ) : load.rows.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No requests yet. When an AI assistant asks for a part we do not have, it will appear
          here.
        </p>
      ) : (
        <RequestsList rows={load.rows} capped={load.capped} filter={filter} now={now} />
      )}
    </AdminShell>
  );
}

function RequestsList({
  rows,
  capped,
  filter,
  now,
}: {
  rows: PartRequest[];
  capped: boolean;
  filter: StatusFilter;
  now: number;
}) {
  const counts = countByStatus(rows);
  const visible = filterByStatus(rows, filter);
  const groups = catalogGroups();
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">{summaryText(summarizeRequests(rows))}</p>
      {capped ? (
        <p className="text-sm text-warn-ink">Only the first 5,000 requests are shown.</p>
      ) : null}

      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const current = f === filter;
            return (
              <li key={f}>
                <Link
                  href={filterHref(f)}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-full border px-4 text-sm ${
                    current
                      ? "border-ink bg-ink font-semibold text-paper"
                      : "border-line-strong text-ink hover:bg-paper-deep"
                  }`}
                >
                  {f === "all" ? "All" : STATUS_LABELS[f]} ({counts[f]})
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-soft">Nothing with that status.</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((req) => (
            <RequestCard key={req.key} req={req} now={now} filter={filter} groups={groups} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({
  req,
  now,
  filter,
  groups,
}: {
  req: PartRequest;
  now: number;
  filter: StatusFilter;
  groups: ReturnType<typeof catalogGroups>;
}) {
  const pins = pinSummary(req.example_pins);
  const uid = req.key.replace(/[^a-zA-Z0-9_-]/g, "_");
  const suggested = req.suggested_catalog_id ? getCatalogPart(req.suggested_catalog_id) : undefined;
  const mapped = req.mapped_catalog_id ? getCatalogPart(req.mapped_catalog_id) : undefined;
  const control =
    "min-h-11 rounded-md border border-line-strong bg-white px-3 text-sm text-ink";
  const button =
    "min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-soft";

  return (
    <li className="rounded-md border border-line bg-white/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold text-ink">{req.display_name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
            {req.kind ? (
              <span className="rounded border border-line px-1.5 py-0.5">{req.kind}</span>
            ) : null}
            <span>First seen {relativeTime(req.first_seen, now)}</span>
            <span>Last seen {relativeTime(req.last_seen, now)}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold leading-none text-ink">Asked by {req.demand}</p>
          <p className="mt-1 text-xs text-mute">{req.calls} requests in total</p>
        </div>
      </div>

      <p className="mt-3">
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${PILL[req.status] ?? ""}`}
        >
          {STATUS_LABELS[req.status] ?? req.status}
        </span>
      </p>

      <dl className="mt-3 space-y-1 text-sm">
        {pins ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Pins the AI listed</dt>
            <dd className="min-w-0 break-words text-ink">{pins}</dd>
          </div>
        ) : null}
        {req.note ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">AI note</dt>
            <dd className="min-w-0 break-words text-ink">{req.note}</dd>
          </div>
        ) : null}
        {req.suggested_catalog_id ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Closest supported part</dt>
            <dd className="min-w-0 break-words text-ink">
              {suggested ? suggested.name : "Unknown part"}
            </dd>
          </div>
        ) : null}
        {req.mapped_catalog_id ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Treated as</dt>
            <dd className="min-w-0 break-words text-ink">
              {mapped ? mapped.name : "Unknown part"}
            </dd>
          </div>
        ) : null}
        {req.admin_note ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Your note</dt>
            <dd className="min-w-0 break-words text-ink">{req.admin_note}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <form action={setRequestStatusAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="key" value={req.key} />
          <input type="hidden" name="back" value={filter} />
          <label htmlFor={`status-${uid}`} className="w-full text-xs text-mute sm:w-auto">
            Status
          </label>
          <select
            id={`status-${uid}`}
            name="status"
            defaultValue={req.status}
            className={`${control} min-w-0 flex-1 sm:flex-none`}
          >
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button type="submit" className={button}>
            Save
          </button>
        </form>

        <form action={setRequestAliasAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="key" value={req.key} />
          <input type="hidden" name="back" value={filter} />
          <label htmlFor={`alias-${uid}`} className="w-full text-xs text-mute sm:w-auto">
            Treat as an existing part
          </label>
          <select
            id={`alias-${uid}`}
            name="catalogId"
            defaultValue={req.mapped_catalog_id ?? req.suggested_catalog_id ?? ""}
            className={`${control} min-w-0 flex-1`}
          >
            <option value="" disabled>
              Choose a part
            </option>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="submit" className={button}>
            Use this part
          </button>
        </form>
        {req.mapped_catalog_id ? (
          <form action={removeRequestAliasAction}>
            <input type="hidden" name="key" value={req.key} />
            <input type="hidden" name="back" value={filter} />
            <button
              type="submit"
              className="min-h-11 rounded-md border border-line-strong px-3 text-sm text-ink hover:bg-paper-deep"
            >
              Remove alias
            </button>
          </form>
        ) : null}

        <form action={setRequestNoteAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="key" value={req.key} />
          <input type="hidden" name="back" value={filter} />
          <label htmlFor={`note-${uid}`} className="w-full text-xs text-mute sm:w-auto">
            Your note
          </label>
          <input
            id={`note-${uid}`}
            name="note"
            type="text"
            maxLength={NOTE_MAX}
            defaultValue={req.admin_note ?? ""}
            className={`${control} min-w-0 flex-1`}
          />
          <button type="submit" className={button}>
            Save note
          </button>
        </form>
      </div>
    </li>
  );
}
