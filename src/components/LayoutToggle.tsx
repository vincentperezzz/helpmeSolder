"use client";

type LayoutToggleProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

const HINT =
  "A breadboard lets you plug parts in with no soldering. Turn it off to see the wires go straight from part to part.";

/** Compact view-only switch: show the wiring on a breadboard or as direct wires. */
export function LayoutToggle({ checked, onChange }: LayoutToggleProps) {
  return (
    <div className="flex min-h-11 items-center gap-2" title={HINT}>
      <span id="layout-toggle-label" className="text-sm font-semibold text-ink">
        Breadboard
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby="layout-toggle-label"
        aria-describedby="layout-toggle-hint"
        onClick={() => onChange(!checked)}
        className="flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
      >
        <span
          className={`relative inline-block h-6 w-11 rounded-full border transition-colors ${
            checked ? "border-copper bg-copper" : "border-line-strong bg-paper-deep"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
      <span id="layout-toggle-hint" className="sr-only">
        {HINT}
      </span>
    </div>
  );
}
