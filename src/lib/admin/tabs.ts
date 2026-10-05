import type { SessionLevel } from "./session";

export type AdminTabId = "overview" | "requests" | "searches" | "catalog" | "settings";
export type AdminTab = { id: AdminTabId; label: string; href: string };

export const ADMIN_TABS: readonly AdminTab[] = [
  { id: "overview", label: "Overview", href: "/admin" },
  { id: "requests", label: "Requests", href: "/admin/requests" },
  { id: "searches", label: "Searches", href: "/admin/searches" },
  { id: "catalog", label: "Catalog", href: "/admin/catalog" },
  { id: "settings", label: "Settings", href: "/admin/settings" },
];

/** A full session sees every tab. A restricted session (default password) sees Settings only. */
export function visibleTabs(session: SessionLevel): AdminTab[] {
  return session === "full" ? [...ADMIN_TABS] : ADMIN_TABS.filter((t) => t.id === "settings");
}

/** Which tab a path belongs to, or null when it is not an admin section. */
export function resolveActiveTab(pathname: string): AdminTabId | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/admin") return "overview";
  for (const tab of ADMIN_TABS) {
    if (tab.id !== "overview" && (path === tab.href || path.startsWith(`${tab.href}/`))) {
      return tab.id;
    }
  }
  return null;
}
