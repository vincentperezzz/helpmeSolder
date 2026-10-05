import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authorizeArea, type AdminArea } from "@/lib/admin/credential";
import { ADMIN_COOKIE, readSessionToken, type SessionLevel } from "@/lib/admin/session";
import { loadAdminAuth } from "@/lib/admin/store";

export type Guard =
  | { kind: "unavailable" }
  | { kind: "login" }
  | { kind: "ok"; session: SessionLevel };

/**
 * Shared gate for every admin page. Admin disabled gives a 404, a restricted
 * session asking for the dashboard goes to settings, and (unless the page can
 * show the sign-in form itself) no session goes back to /admin.
 */
export async function guardAdmin(
  area: AdminArea,
  options: { loginInline?: boolean } = {},
): Promise<Guard> {
  const auth = await loadAdminAuth();
  if (auth.kind === "disabled") notFound();
  if (auth.kind === "unavailable") return { kind: "unavailable" };

  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const session = readSessionToken(token, auth.key);
  const access = authorizeArea(session, area);
  if (access.kind === "settings") redirect("/admin/settings?notice=default");
  if (access.kind === "login" || !session) {
    if (options.loginInline) return { kind: "login" };
    redirect("/admin");
  }
  return { kind: "ok", session };
}
