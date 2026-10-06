"use client";

import type { GuideChecks } from "./model";

type StatusPillProps = {
  checks: GuideChecks;
  open: boolean;
  onToggle: () => void;
  controlsId: string;
};

/** Top-bar pill that says "Blocked" or "Heads up" and opens the details. */
export function StatusPill({ checks, open, onToggle, controlsId }: StatusPillProps) {
  if (checks.level === "clear") return null;
  const label = checks.level === "blocked" ? "Blocked" : "Heads up";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controlsId}
      data-level={checks.level}
      data-print-hide="true"
      className="ga-pill"
    >
      {label}
      <span className="ga-pill-count" aria-hidden>
        {checks.count}
      </span>
      <span className="ga-ph">
        , {checks.count} {checks.count === 1 ? "message" : "messages"}
      </span>
    </button>
  );
}

type ChecksRegionProps = {
  checks: GuideChecks;
  open: boolean;
  onClose: () => void;
  id: string;
};

/**
 * The details behind the status pill. It sits at the top of the right panel,
 * above the tabs, and scrolls on its own if the list is long. It stays in the
 * page (hidden) when closed so a printout still carries the warnings.
 */
export function ChecksRegion({ checks, open, onClose, id }: ChecksRegionProps) {
  if (checks.level === "clear") return null;
  return (
    <section
      id={id}
      data-screen-hide={open ? undefined : "true"}
      data-level={checks.level}
      data-print-keep="true"
      data-print-section="checks"
      aria-label={checks.level === "blocked" ? "Why this guide is blocked" : "Heads up before you build"}
      className="ga-checks"
    >
      <div className="space-y-3 px-4 py-3 text-sm">
        {checks.groups.map((group) => (
          <div key={group.id} role={group.danger ? "status" : undefined}>
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        <button
          type="button"
          onClick={onClose}
          data-print-hide="true"
          className="min-h-11 text-sm font-semibold underline underline-offset-2 hover:opacity-80"
        >
          Close details
        </button>
      </div>
    </section>
  );
}
