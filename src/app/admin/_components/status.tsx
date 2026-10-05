import { DENIED_TEXT } from "@/lib/admin/db-errors";

/** Small "the table exists and is being written to" marker. */
export function TrackingOn({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-soft">
      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-flux" />
      <span>
        <strong className="font-semibold text-ink">Tracking is on.</strong> {children}
      </span>
    </p>
  );
}

export function NotTracking({ migration }: { migration: string }) {
  return (
    <p className="text-sm text-ink-soft">
      Not tracking yet. Run supabase/migrations/{migration} in the Supabase SQL editor.
    </p>
  );
}

export function NoAccess() {
  return (
    <p role="alert" className="text-sm text-warn-ink">
      {DENIED_TEXT}
    </p>
  );
}
