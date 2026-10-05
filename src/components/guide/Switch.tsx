"use client";

import type { ReactNode } from "react";

type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Visible label. It also names the switch for screen readers. */
  children: ReactNode;
  /** Longer help text, read after the label and shown as a tooltip. */
  hint?: string;
  hintId: string;
  tone?: "copper" | "flux";
  className?: string;
};

/**
 * Accessible on/off switch: one button, a 44 by 24 track and a 20px knob that
 * moves between two fixed positions inside it. Styles live in guide.css.
 */
export function Switch({
  checked,
  onChange,
  children,
  hint,
  hintId,
  tone = "copper",
  className = "",
}: SwitchProps) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? hintId : undefined}
        title={hint}
        data-tone={tone}
        onClick={() => onChange(!checked)}
        className={`ga-switch ${className}`}
      >
        <span aria-hidden className="ga-switch-track">
          <span className="ga-switch-knob" />
        </span>
        <span>{children}</span>
      </button>
      {hint ? (
        <span id={hintId} className="ga-ph">
          {hint}
        </span>
      ) : null}
    </>
  );
}
