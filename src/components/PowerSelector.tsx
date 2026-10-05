"use client";

import type { PowerSource } from "@/lib/catalog/types";
import type { POWER_SOURCE_VALUES } from "@/lib/guides/power-source";

export type PowerSourceValue = (typeof POWER_SOURCE_VALUES)[number];

export const POWER_CHOICES: ReadonlyArray<{
  value: PowerSourceValue;
  label: string;
  /** Short fact for a chip that reads "Powered by ...". */
  fact: string;
  hint: string;
}> = [
  {
    value: "usb_wall",
    label: "USB cable (easiest)",
    fact: "a USB cable",
    hint: "Plug a USB cable from a phone charger into the board. Nothing to solder for power.",
  },
  {
    value: "battery_9v",
    label: "9V battery",
    fact: "a 9V battery",
    hint: "Good for projects you carry around.",
  },
  {
    value: "battery_2aa",
    label: "2 AA batteries",
    fact: "2 AA batteries",
    hint: "Small and light. Fine for low-power projects you carry around.",
  },
  {
    value: "battery_3aa",
    label: "3 AA batteries",
    fact: "3 AA batteries",
    hint: "Common and easy to find. Good for projects you carry around.",
  },
  {
    value: "battery_18650",
    label: "18650 battery",
    fact: "an 18650 battery",
    hint: "A rechargeable cell that lasts a long time. Handle with care.",
  },
];

export function powerChoiceLabel(source: PowerSource | null): string {
  return POWER_CHOICES.find((choice) => choice.value === source)?.label ?? "Not set";
}

/** The guide's own power as a fact: "3 AA batteries", or null when it is not set. */
export function powerFact(source: PowerSource | null): string | null {
  return POWER_CHOICES.find((choice) => choice.value === source)?.fact ?? null;
}

type PowerSelectorProps = {
  value: PowerSource | null;
  onChange: (value: PowerSourceValue) => void;
  /** Called by the small "Clear" button next to a picked value. */
  onClear?: () => void;
};

/**
 * "Powered by" dropdown. The workspace only renders it when the guide has no
 * power source of its own: a guide that names its power shows that as a fact
 * instead. A native select keeps keyboard and phone behavior right.
 */
export function PowerSelector({ value, onChange, onClear }: PowerSelectorProps) {
  const hint = POWER_CHOICES.find((choice) => choice.value === value)?.hint;
  return (
    <div className="flex min-h-11 items-center gap-2" title={hint}>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="shrink-0">Power source</span>
        <select
          value={value ?? ""}
          onChange={(event) => {
            const next = POWER_CHOICES.find((choice) => choice.value === event.target.value);
            if (next) onChange(next.value);
          }}
          className={`min-h-9 min-w-0 rounded-[10px] border bg-white px-2.5 text-sm font-medium text-ink hover:border-copper ${
            value === null ? "border-copper" : "border-line-strong"
          }`}
        >
          {value === null ? (
            <option value="" disabled>
              Pick one
            </option>
          ) : null}
          {POWER_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
      {value !== null && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 px-1 text-sm font-semibold text-ink underline underline-offset-2 hover:text-copper"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
