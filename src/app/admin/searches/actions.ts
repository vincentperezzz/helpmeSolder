"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authorizeArea } from "@/lib/admin/credential";
import {
  isMissingSearchesTable,
  parseSearchStatus,
  parseSourceFilter,
  parseView,
  searchesHref,
  validateAdminNote,
  validateRequestKey,
} from "@/lib/admin/searches";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin/session";
import { loadAdminAuth } from "@/lib/admin/store";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Every search action re-checks the signed cookie. Restricted sessions cannot act. */
async function requireFullSession(): Promise<void> {
  const auth = await loadAdminAuth();
  if (auth.kind !== "ready") redirect("/admin");
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  const session = readSessionToken(cookie, auth.key);
  const access = authorizeArea(session, "dashboard");
  if (access.kind !== "allow") redirect("/admin");
}

function back(formData: FormData, code: string): never {
  redirect(
    searchesHref(parseView(field(formData, "back")), parseSourceFilter(field(formData, "backSource")), code),
  );
}

async function updateSearch(
  formData: FormData,
  values: Record<string, string | null>,
  okCode: string,
): Promise<never> {
  const key = validateRequestKey(field(formData, "key"));
  if (!key) return back(formData, "bad-search");

  let code = okCode;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("catalog_searches")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("key", key)
      .select("key");
    if (error) code = isMissingSearchesTable(error) ? "no-table" : "failed";
    else if (!data || data.length === 0) code = "not-found";
  } catch {
    code = "failed";
  }
  if (code === okCode) revalidatePath("/admin/searches");
  return back(formData, code);
}

export async function setSearchStatusAction(formData: FormData): Promise<void> {
  await requireFullSession();
  const status = parseSearchStatus(field(formData, "status"));
  if (!status) return back(formData, "bad-status");
  const ok = status === "handled" ? "handled" : status === "ignored" ? "ignored" : "undone";
  return updateSearch(formData, { status }, ok);
}

export async function setSearchNoteAction(formData: FormData): Promise<void> {
  await requireFullSession();
  const note = validateAdminNote(field(formData, "note"));
  if (!note.ok) return back(formData, "bad-note");
  return updateSearch(formData, { admin_note: note.value }, "note-saved");
}

/** Copies a search that found nothing into Requests, unless that key is already there. Then marks it handled. */
export async function addSearchToRequestsAction(formData: FormData): Promise<void> {
  await requireFullSession();
  const key = validateRequestKey(field(formData, "key"));
  if (!key) return back(formData, "bad-search");

  try {
    const supabase = getSupabaseAdmin();
    const found = await supabase
      .from("catalog_searches")
      .select("key,query,demand,searches,first_seen,last_seen")
      .eq("key", key)
      .maybeSingle();
    if (found.error) {
      return back(formData, isMissingSearchesTable(found.error) ? "no-table" : "failed");
    }
    const search = found.data;
    if (!search) return back(formData, "not-found");

    const now = new Date().toISOString();
    const insert = await supabase
      .from("part_requests")
      .upsert(
        {
          key: search.key,
          display_name: String(search.query).slice(0, 200),
          kind: null,
          source: "search",
          demand: search.demand,
          calls: search.searches,
          note: null,
          status: "new",
          first_seen: search.first_seen,
          last_seen: search.last_seen,
          updated_at: now,
        },
        { onConflict: "key", ignoreDuplicates: true },
      )
      .select("key");
    if (insert.error) return back(formData, "failed");
    if (!insert.data || insert.data.length === 0) return back(formData, "in-requests");

    const done = await supabase
      .from("catalog_searches")
      .update({ status: "handled", updated_at: now })
      .eq("key", key);
    if (done.error) return back(formData, "added-not-marked");
  } catch {
    return back(formData, "failed");
  }
  revalidatePath("/admin/searches");
  revalidatePath("/admin/requests");
  return back(formData, "added");
}
