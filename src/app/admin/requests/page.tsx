import { listCatalog } from "@/lib/catalog";
import {
  NOTE_MAX,
  loadRequests,
  parseKindFilter,
  parseStatusFilter,
} from "@/lib/admin/requests";
import { guardAdmin } from "../_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "../_components/meta";
import { AdminShell } from "../_components/shell";
import { RequestsView } from "./_components/RequestsView";
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

type PageProps = { searchParams: Promise<{ status?: string; kind?: string; msg?: string }> };

function nowMs(): number {
  return Date.now();
}

function catalogData() {
  const catalog = listCatalog();
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const groups = [
    { label: "Boards", parts: [...catalog.boards].sort(byName) },
    { label: "Modules and sensors", parts: [...catalog.modules].sort(byName) },
    { label: "Basic parts", parts: [...catalog.passives].sort(byName) },
  ].map((g) => ({ label: g.label, parts: g.parts.map((p) => ({ id: p.id, name: p.name })) }));
  const names: Record<string, string> = {};
  for (const g of groups) for (const p of g.parts) names[p.id] = p.name;
  return { groups, names };
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
  const status = parseStatusFilter(params.status);
  const kind = parseKindFilter(params.kind);
  const message = params.msg ? MESSAGES[params.msg] : undefined;
  const load = await loadRequests();
  const catalog = catalogData();

  return (
    <AdminShell session={guard.session} active="requests" title="Requests">
      {load.kind === "missing" ? (
        <>
          {message ? <Notice message={message} /> : null}
          <p className="text-sm text-ink-soft">
            Not tracking yet. Run supabase/migrations/0005_part_requests.sql in the Supabase SQL
            editor.
          </p>
        </>
      ) : load.kind === "error" ? (
        <p role="alert" className="text-sm text-warn-ink">
          Could not read requests from the database. Try again in a moment.
        </p>
      ) : (
        <RequestsView
          requests={load.rows}
          active={{ status, kind }}
          message={message}
          capped={load.capped}
          now={nowMs()}
          catalogGroups={catalog.groups}
          partNames={catalog.names}
          actions={{
            setStatus: setRequestStatusAction,
            setAlias: setRequestAliasAction,
            removeAlias: removeRequestAliasAction,
            setNote: setRequestNoteAction,
          }}
        />
      )}
    </AdminShell>
  );
}

function Notice({ message }: { message: { ok: boolean; text: string } }) {
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
