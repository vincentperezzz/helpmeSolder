"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import type { CircuitView } from "@/components/guide/view-storage";

type ViewToggleProps = {
  value: CircuitView;
  onChange: (value: CircuitView) => void;
};

const HINT =
  "Schematic is how electronics people draw the same circuit, with standard symbols. Flip between the two to learn the symbols.";

const OPTIONS: { value: CircuitView; label: string }[] = [
  { value: "parts", label: "Real parts" },
  { value: "schematic", label: "Schematic" },
];

/** Two-option view switch: the real parts picture or the schematic drawing. */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const hintId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(index: number, event: KeyboardEvent) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].value);
    refs.current[next]?.focus();
  }

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Picture style"
        aria-describedby={hintId}
        title={HINT}
        data-value={value}
        className="ga-seg"
      >
        {OPTIONS.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => move(index, event)}
              className="ga-seg-btn"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span id={hintId} className="ga-ph">
        {HINT}
      </span>
    </>
  );
}
