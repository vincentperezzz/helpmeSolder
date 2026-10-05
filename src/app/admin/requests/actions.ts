"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCatalogPart } from "@/lib/catalog";
import { authorizeArea } from "@/lib/admin/credential";
import {
  isMissingRequestsTable,
  parseStatus,
  parseKindFilter,
  parseStatusFilter,
  validateAdminNote,
  validateAliasTarget,
  validateRequestKey,
} from "@/lib/admin/requests";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin/session";
import { loadAdminAuth } from "@/lib/admin/store";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Every request action re-checks the signed cookie. Restricted sessions cannot act. */
async function requireFullSession(): Promise<void> {
  const auth = await loadAdminAuth();
  if (auth.kind !== "ready") redirect("/admin");
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  const session = readSessionToken(cookie, auth.key);
  const access = authorizeArea(session, "dashboard");
  if (access.kind !== "allow") redirect("/admin");
}

function back(formData: FormData, code: string): never {
  const status = parseStatusFilter(field(formData, "back"));
  const params = new URLSearchParams();
  const kind = parseKindFilter(field(formData, "backKind"));
  if (status !== "all") params.set("status", status);
  if (kind !== "all") params.set("kind", kind);
  params.set("msg", code);
  redirect(`/admin/requests?${params.toString()}`);
}

async function updateRequest(
  formData: FormData,
  values: Record<string, string | null>,
  okCode: string,
): Promise<never> {
  const key = validateRequestKey(field(formData, "key"));
  if (!key) return back(formData, "bad-request");

  let code = okCode;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("part_requests")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("key", key)
      .select("key");
    if (error) code = isMissingRequestsTable(error) ? "no-table" : "failed";
    else if (!data || data.length === 0) code = "not-found";
  } catch {
    code = "failed";
  }
  if (code === okCode) revalidatePath("/admin/requests");
  return back(formData, code);
}

export async function setRequestStatusAction(formData: FormData): Promise<void> {
  await requireFullSession();
  const status = parseStatus(field(formData, "status"));
  if (!status) return back(formData, "bad-status");
  return updateRequest(formData, { status }, "status-saved");
}

export async function setRequestAliasAction(formData: FormData): Promise<void> {
  await requireFullSession();
  const target = validateAliasTarget(field(formData, "catalogId"), (id) => Boolean(getCatalogPart(id)));
  if (!target.ok) return back(formData, "bad-part");
  return updateRequest(formData, { mapped_catalog_id: target.id, status: "shipped" }, "alias-saved");
}

export async function removeRequestAliasAction(formData: FormData): Promise<void> {
  await requireFullSession();
  return updateRequest(formData, { mapped_catalog_id: null }, "alias-removed");
}

export async function setRequestNoteAction(formData: FormData): Promise<void> {
  await requireFullSession();
  const note = validateAdminNote(field(formData, "note"));
  if (!note.ok) return back(formData, "bad-note");
  return updateRequest(formData, { admin_note: note.value }, "note-saved");
}
