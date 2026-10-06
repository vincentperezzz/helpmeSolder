"use client";

import { useState } from "react";
import { CheckIcon } from "./icons";

type DoneToggleProps = {
  pressed: boolean;
  onToggle: () => void;
  /** Shown when the item is done, for example "Soldered". */
  doneLabel: string;
  /** Shown when it is not, for example "Mark soldered". */
  openLabel: string;
  /** Names which item this belongs to for screen readers, for example "wire 3". */
  context: string;
};

/**
 * The one explicit "this is finished" control for a joint or a step: a 44px
 * button that is outlined while open and filled flux green with a check when
 * done. The check draws only after a tap, never on first load.
 */
export function DoneToggle({ pressed, onToggle, doneLabel, openLabel, context }: DoneToggleProps) {
  const [tapped, setTapped] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-tapped={tapped}
      onClick={() => {
        setTapped(true);
        onToggle();
      }}
      className="ga-done-btn"
    >
      <span className="ga-done-check" aria-hidden>
        <CheckIcon size={20} />
      </span>
      <span>{pressed ? doneLabel : openLabel}</span>
      <span className="sr-only">, {context}</span>
    </button>
  );
}
