"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAgainstCredential } from "@/lib/admin/credential";
import {
  clearLoginFailures,
  clientKeyFromHeaders,
  isLoginBlocked,
  recordLoginFailure,
} from "@/lib/admin/login-limit";
import { hashPassword, validateNewPassword } from "@/lib/admin/password";
import { ADMIN_COOKIE, createSessionToken, readSessionToken } from "@/lib/admin/session";
import { loadAdminAuth, saveStoredPassword, sessionKeyForHash } from "@/lib/admin/store";

async function setSessionCookie(key: string, restricted: boolean): Promise<void> {
  const token = createSessionToken(key, Date.now(), restricted);
  (await cookies()).set(ADMIN_COOKIE, token.value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires: new Date(token.expires),
  });
}

async function clientKey(): Promise<string> {
  const requestHeaders = await headers();
  return clientKeyFromHeaders((name) => requestHeaders.get(name));
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function loginAction(formData: FormData): Promise<void> {
  const auth = await loadAdminAuth();
  if (auth.kind !== "ready") redirect("/admin");

  const key = await clientKey();
  if (isLoginBlocked(key)) redirect("/admin?error=locked");

  const submitted = formData.get("password");
  if (typeof submitted !== "string" || !(await verifyAgainstCredential(auth.credential, submitted))) {
    recordLoginFailure(key);
    redirect("/admin?error=wrong");
  }

  clearLoginFailures(key);
  // The built-in default password only opens the settings page.
  const restricted = auth.credential.source === "default";
  await setSessionCookie(auth.key, restricted);
  redirect(restricted ? "/admin/settings?notice=default" : "/admin");
}

export async function logoutAction(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0,
  });
  redirect("/admin");
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const auth = await loadAdminAuth();
  if (auth.kind !== "ready") redirect("/admin");

  // Any valid session (full or restricted) may change the password.
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!readSessionToken(cookie, auth.key)) redirect("/admin");

  const key = await clientKey();
  if (isLoginBlocked(key)) redirect("/admin/settings?error=locked");

  const current = text(formData, "current");
  if (!(await verifyAgainstCredential(auth.credential, current))) {
    recordLoginFailure(key);
    redirect("/admin/settings?error=current");
  }

  const problem = validateNewPassword({
    current,
    next: text(formData, "next"),
    confirm: text(formData, "confirm"),
  });
  if (problem) redirect(`/admin/settings?error=${problem}`);

  const hash = await hashPassword(text(formData, "next"));
  const saved = await saveStoredPassword(hash);
  if (saved !== "ok") {
    redirect(`/admin/settings?error=${saved === "no-table" ? "no-table" : "save"}`);
  }

  clearLoginFailures(key);
  // The signing key follows the new hash, so every older session stops working.
  await setSessionCookie(sessionKeyForHash(hash), false);
  redirect("/admin?changed=1");
}
