"use client";

import { LayoutToggle } from "@/components/LayoutToggle";
import { PowerSelector, type PowerSourceValue } from "@/components/PowerSelector";
import type { PowerSource } from "@/lib/catalog/types";
import { PowerChip } from "./TopBar";

type ControlsBarProps = {
  /** The guide's own power as a fact. When set, no power dropdown is shown. */
  powerFact: string | null;
  /** The viewer's pick, only used while the guide has no power source. */
  chosenPower: PowerSource | null;
  onChoosePower: (value: PowerSourceValue) => void;
  onClearPower: () => void;
  breadboard: boolean;
  onBreadboardChange: (value: boolean) => void;
  /** True when the viewer is looking at the other layout than the one the guide was written with. */
  layoutPreview: boolean;
  ownBreadboard: boolean;
  onBackToOriginal: () => void;
};

/**
 * One slim row above the canvas. The power dropdown only exists for a guide
 * with no power source. A guide that names its power shows that as a chip in
 * the top bar (and here on small screens) because the author already decided.
 */
export function ControlsBar({
  powerFact,
  chosenPower,
  onChoosePower,
  onClearPower,
  breadboard,
  onBreadboardChange,
  layoutPreview,
  ownBreadboard,
  onBackToOriginal,
}: ControlsBarProps) {
  return (
    <div data-print-hide="true" className="ga-controls">
      {powerFact !== null ? (
        <span className="min-w-0 md:hidden">
          <PowerChip fact={powerFact} />
        </span>
      ) : (
        <>
          <PowerSelector value={chosenPower} onChange={onChoosePower} onClear={onClearPower} />
          {chosenPower === null ? (
            <p className="hidden text-xs text-mute 2xl:block">
              Pick one so the picture and checklist can show it.
            </p>
          ) : null}
        </>
      )}
      <LayoutToggle checked={breadboard} onChange={onBreadboardChange} />
      {layoutPreview ? (
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 text-xs text-ink-soft sm:ml-auto">
          <span>
            Preview: this guide was written with {ownBreadboard ? "a breadboard" : "direct wires"}.
          </span>
          <button
            type="button"
            onClick={onBackToOriginal}
            className="min-h-11 text-sm font-semibold text-ink underline underline-offset-2 hover:text-copper"
          >
            Back to the original
          </button>
        </p>
      ) : null}
    </div>
  );
}
