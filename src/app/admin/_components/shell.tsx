import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionLevel } from "@/lib/admin/session";
import { visibleTabs, type AdminTabId } from "@/lib/admin/tabs";
import { logoutAction } from "../actions";

export function AdminTabs({ session, active }: { session: SessionLevel; active: AdminTabId }) {
  const tabs = visibleTabs(session);
  return (
    <nav aria-label="Admin sections" className="mb-6 border-b border-line">
      <ul className="-mb-px flex overflow-x-auto">
        {tabs.map((tab) => {
          const current = tab.id === active;
          return (
            <li key={tab.id} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-2 px-4 text-sm ${
                  current
                    ? "border-copper font-semibold text-ink"
                    : "border-transparent text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Page frame for every signed-in admin page: title, Log out and the tab bar. */
export function AdminShell({
  session,
  active,
  title,
  narrow,
  children,
}: {
  session: SessionLevel;
  active: AdminTabId;
  title: string;
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <main className={`mx-auto w-full px-4 py-8 sm:px-6 ${narrow ? "max-w-md" : "max-w-5xl"}`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-mute">HelpmeSolder</p>
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="min-h-11 rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-paper-deep"
          >
            Log out
          </button>
        </form>
      </header>
      <AdminTabs session={session} active={active} />
      {children}
    </main>
  );
}
