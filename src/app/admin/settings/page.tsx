import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authorizeArea } from "@/lib/admin/credential";
import { MIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin/session";
import { loadAdminAuth } from "@/lib/admin/store";
import { changePasswordAction } from "../actions";
import { AdminShell } from "../_components/shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin settings | HelpmeSolder",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  openGraph: null,
  twitter: null,
  referrer: "no-referrer",
};

const ERRORS: Record<string, string> = {
  current: "Your current password is not right.",
  locked: "Too many tries. Wait 15 minutes and try again.",
  mismatch: "The two new passwords do not match.",
  short: `The new password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
  long: "The new password is too long. Use 200 characters or fewer.",
  common: "That password is too easy to guess. Pick something else.",
  same: "The new password must be different from the current one.",
  "no-table":
    "The password could not be saved because the admin_settings table does not exist yet. Apply supabase/migrations/0003_admin_settings.sql first.",
  save: "The password could not be saved. Check the Supabase settings and try again.",
};

const SOURCE_TEXT = {
  default: "the built-in default",
  env: "an environment variable",
  stored: "set here",
} as const;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const auth = await loadAdminAuth();
  if (auth.kind === "disabled") notFound();
  if (auth.kind === "unavailable") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Admin settings</h1>
        <p role="alert" className="mt-4 text-sm text-warn-ink">
          The saved password could not be checked right now. Try again in a moment.
        </p>
      </main>
    );
  }

  const session = readSessionToken((await cookies()).get(ADMIN_COOKIE)?.value, auth.key);
  if (!session || authorizeArea(session, "settings").kind !== "allow") redirect("/admin");

  const { error, notice } = await searchParams;
  const source = auth.credential.source;
  const message = error ? ERRORS[error] : undefined;

  return (
    <AdminShell session={session} active="settings" title="Admin settings">
      <div className="mx-auto w-full max-w-md">
      {source === "default" ? (
        <p role="alert" className="mb-4 rounded-md border border-warn-ink p-3 text-sm text-warn-ink">
          {notice === "default"
            ? "You are using the default password. Choose a new one to continue."
            : "The default password is still active. Choose a new one to unlock the overview."}
        </p>
      ) : null}

      {auth.tableMissing ? (
        <p role="status" className="mb-4 rounded-md border border-line bg-white/60 p-3 text-sm text-ink-soft">
          The admin_settings table does not exist yet, so a new password cannot be saved. Apply
          supabase/migrations/0003_admin_settings.sql in the Supabase SQL Editor, then come back.
        </p>
      ) : null}

      <p className="rounded-md border border-line bg-white/60 p-3 text-sm text-ink-soft">
        Current password: {SOURCE_TEXT[source]}.
        {source === "env"
          ? " Changing it here overrides the environment value from now on."
          : null}
        {source === "stored" && auth.changedAt
          ? ` Last changed ${new Date(auth.changedAt).toUTCString()}.`
          : null}
      </p>

      <form action={changePasswordAction} className="mt-6 space-y-4">
        <Field id="current" name="current" label="Current password" autoComplete="current-password" />
        <Field
          id="next"
          name="next"
          label="New password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. Not "admin".`}
          minLength={MIN_PASSWORD_LENGTH}
        />
        <Field id="confirm" name="confirm" label="Confirm new password" autoComplete="new-password" />
        {message ? (
          <p role="alert" className="text-sm text-warn-ink">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink-soft"
        >
          Change password
        </button>
      </form>

      <p className="mt-8 text-sm text-mute">
        Changing the password signs out every open admin session. If you forget it, delete the
        row in the admin_settings table in the Supabase table editor. The dashboard then falls
        back to the environment value, or to the default password.
      </p>
      </div>
    </AdminShell>
  );
}

function Field({
  id,
  name,
  label,
  autoComplete,
  hint,
  minLength,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  hint?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={minLength}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-ink"
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
