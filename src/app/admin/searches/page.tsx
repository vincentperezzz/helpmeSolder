import { listCatalog } from "@/lib/catalog";
import {
  NOTE_MAX,
  loadSearches,
  parseSourceFilter,
  parseView,
} from "@/lib/admin/searches";
import { guardAdmin } from "../_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "../_components/meta";
import { AdminShell } from "../_components/shell";
import { NoAccess, NotTracking, TrackingOn } from "../_components/status";
import { SearchesView } from "./_components/SearchesView";
import { addSearchToRequestsAction, setSearchNoteAction, setSearchStatusAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("Admin searches");

type Message = { ok: boolean; text: string; link?: { href: string; label: string } };

const MESSAGES: Record<string, Message> = {
  handled: { ok: true, text: "Marked as handled." },
  ignored: { ok: true, text: "Ignored." },
  undone: { ok: true, text: "Back to waiting." },
  "note-saved": { ok: true, text: "Note saved." },
  added: { ok: true, text: "Added to Requests and marked as handled." },
  "added-not-marked": {
    ok: true,
    text: "Added to Requests, but this search could not be marked as handled.",
  },
  "in-requests": {
    ok: false,
    text: "That is already in Requests.",
    link: { href: "/admin/requests", label: "Open Requests" },
  },
  "bad-status": { ok: false, text: "That status is not one of the allowed choices." },
  "bad-note": { ok: false, text: `Keep the note to ${NOTE_MAX} characters or fewer.` },
  "bad-search": { ok: false, text: "That search could not be found." },
  "not-found": { ok: false, text: "That search no longer exists." },
  "no-table": {
    ok: false,
    text: "Not tracking yet. Run supabase/migrations/0006_catalog_searches.sql in the Supabase SQL editor.",
  },
  failed: { ok: false, text: "Could not save that change. Try again in a moment." },
};

type PageProps = { searchParams: Promise<{ view?: string; source?: string; msg?: string }> };

function nowMs(): number {
  return Date.now();
}

function catalogNames(): Record<string, string> {
  const catalog = listCatalog();
  const names: Record<string, string> = {};
  for (const p of [...catalog.boards, ...catalog.modules, ...catalog.passives]) names[p.id] = p.name;
  return names;
}

export default async function AdminSearchesPage({ searchParams }: PageProps) {
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
  const view = parseView(params.view);
  const source = parseSourceFilter(params.source);
  const message = params.msg ? MESSAGES[params.msg] : undefined;
  const load = await loadSearches();

  return (
    <AdminShell session={guard.session} active="searches" title="Searches">
      {load.kind === "missing" ? (
        <>
          {message ? <Notice message={message} /> : null}
          <NotTracking migration="0006_catalog_searches.sql" />
        </>
      ) : load.kind === "denied" ? (
        <>
          {message ? <Notice message={message} /> : null}
          <NoAccess />
        </>
      ) : load.kind === "error" ? (
        <p role="alert" className="text-sm text-warn-ink">
          Could not read searches from the database. Try again in a moment.
        </p>
      ) : (
        <>
          <div className="mb-4">
            <TrackingOn>
              {load.rows.length === 0
                ? "The table is ready and nothing has been searched yet."
                : `${load.rows.length} ${load.rows.length === 1 ? "search has" : "searches have"} been recorded so far.`}
            </TrackingOn>
          </div>
          <SearchesView
            searches={load.rows}
            active={{ view, source }}
            message={message}
            capped={load.capped}
            now={nowMs()}
            partNames={catalogNames()}
            actions={{
              setStatus: setSearchStatusAction,
              setNote: setSearchNoteAction,
              addToRequests: addSearchToRequestsAction,
            }}
          />
        </>
      )}
    </AdminShell>
  );
}

function Notice({ message }: { message: Message }) {
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={`mb-4 rounded-md border border-line bg-white/60 p-3 text-sm ${
        message.ok ? "text-ink" : "text-warn-ink"
      }`}
    >
      {message.text}
    </p>
  );
}
