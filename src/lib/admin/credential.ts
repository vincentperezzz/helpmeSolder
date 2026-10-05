import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/api/auth";
import { verifyPassword } from "./password";
import type { SessionLevel } from "./session";

/** The built-in password used when nothing else is configured. */
export const DEFAULT_ADMIN_PASSWORD = "admin";

export type Credential =
  | { source: "stored"; hash: string }
  | { source: "env"; password: string }
  | { source: "default" };

export type CredentialInput = {
  /** Password hash saved in the admin_settings table, if any. */
  stored: string | null;
  /** ADMIN_PASSWORD. Empty counts as unset. */
  envPassword: string | undefined;
  /** ADMIN_DISABLE_DEFAULT_PASSWORD is "true". */
  disableDefault: boolean;
};

/** Order: saved in the database, then environment, then the built-in default. */
export function resolveCredential(input: CredentialInput): Credential | null {
  if (input.stored) return { source: "stored", hash: input.stored };
  if (input.envPassword) return { source: "env", password: input.envPassword };
  if (input.disableDefault) return null;
  return { source: "default" };
}

export function isDefaultDisabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export async function verifyAgainstCredential(
  credential: Credential,
  submitted: string,
): Promise<boolean> {
  switch (credential.source) {
    case "stored":
      return verifyPassword(submitted, credential.hash);
    case "env":
      return safeEqual(submitted, credential.password);
    case "default":
      return safeEqual(submitted, DEFAULT_ADMIN_PASSWORD);
  }
}

/**
 * Key that signs session cookies. It is derived from the active credential, so
 * changing the password changes the key and every old cookie stops working.
 * The pepper is a server-side secret when one is available.
 */
export function sessionKeyFor(credential: Credential, pepper: string | undefined): string {
  const material =
    credential.source === "stored"
      ? `stored:${credential.hash}`
      : credential.source === "env"
        ? `env:${credential.password}`
        : `default:${DEFAULT_ADMIN_PASSWORD}`;
  return createHmac("sha256", pepper ?? "")
    .update(`hms-admin-session\n${material}`)
    .digest("hex");
}


export type AdminArea = "dashboard" | "settings";
export type Access = { kind: "allow" } | { kind: "login" } | { kind: "settings" };

/** Pure gatekeeper. A restricted session (default password) may only reach settings. */
export function authorizeArea(session: SessionLevel | null, area: AdminArea): Access {
  if (!session) return { kind: "login" };
  if (session === "full") return { kind: "allow" };
  return area === "settings" ? { kind: "allow" } : { kind: "settings" };
}
