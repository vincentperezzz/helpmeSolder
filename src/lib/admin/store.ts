import { classifyDbError, type DbError } from "./db-errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  isDefaultDisabled,
  resolveCredential,
  sessionKeyFor,
  type Credential,
} from "./credential";

export type StoredPassword =
  | { state: "none" }
  | { state: "set"; hash: string; changedAt: string | null }
  /** The admin_settings table does not exist yet (migration not applied). */
  | { state: "no-table" }
  /** The database could not be read. Never fall back to a weaker password. */
  | { state: "error" };

function isMissingTable(error: DbError): boolean {
  return classifyDbError(error, "admin_settings") === "missing";
}

/** Server-side only. Reads the saved password hash, if there is one. */
export async function readStoredPassword(): Promise<StoredPassword> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    // No database configured at all (for example local development).
    return { state: "no-table" };
  }
  try {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("password_hash,password_changed_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) return isMissingTable(error) ? { state: "no-table" } : { state: "error" };
    if (!data || typeof data.password_hash !== "string" || !data.password_hash) {
      return { state: "none" };
    }
    return {
      state: "set",
      hash: data.password_hash,
      changedAt: typeof data.password_changed_at === "string" ? data.password_changed_at : null,
    };
  } catch {
    return { state: "error" };
  }
}

export type SaveResult = "ok" | "no-table" | "error";

/** Server-side only. Saves the new password hash (single row, id 1). */
export async function saveStoredPassword(hash: string): Promise<SaveResult> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("admin_settings")
      .upsert({ id: 1, password_hash: hash, password_changed_at: new Date().toISOString() });
    if (!error) return "ok";
    return isMissingTable(error) ? "no-table" : "error";
  } catch {
    return "error";
  }
}

export type AdminAuthState =
  | { kind: "disabled" }
  | { kind: "unavailable" }
  | {
      kind: "ready";
      credential: Credential;
      key: string;
      tableMissing: boolean;
      changedAt: string | null;
    };

/** Server-side only. Works out which password is active and the cookie signing key. */
export async function loadAdminAuth(): Promise<AdminAuthState> {
  const stored = await readStoredPassword();
  if (stored.state === "error") return { kind: "unavailable" };
  const credential = resolveCredential({
    stored: stored.state === "set" ? stored.hash : null,
    envPassword: process.env.ADMIN_PASSWORD || undefined,
    disableDefault: isDefaultDisabled(process.env.ADMIN_DISABLE_DEFAULT_PASSWORD),
  });
  if (!credential) return { kind: "disabled" };
  return {
    kind: "ready",
    credential,
    key: sessionKeyFor(credential, process.env.SUPABASE_SERVICE_ROLE_KEY),
    tableMissing: stored.state === "no-table",
    changedAt: stored.state === "set" ? stored.changedAt : null,
  };
}

export function sessionKeyForHash(hash: string): string {
  return sessionKeyFor({ source: "stored", hash }, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
