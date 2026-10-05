"use client";

import type { PowerSource } from "@/lib/catalog/types";
import type { POWER_SOURCE_VALUES } from "@/lib/guides/power-source";

export type PowerSourceValue = (typeof POWER_SOURCE_VALUES)[number];

export const POWER_CHOICES: ReadonlyArray<{
  value: PowerSourceValue;
  label: string;
  hint: string;
}> = [
  {
    value: "usb_wall",
    label: "USB cable (easiest)",
    hint: "Plug a USB cable from a phone charger into the board. Nothing to solder for power.",
  },
  {
    value: "battery_9v",
    label: "9V battery",
    hint: "Good for projects you carry around.",
  },
  {
    value: "battery_2aa",
    label: "2 AA batteries",
    hint: "Small and light. Fine for low-power projects you carry around.",
  },
  {
    value: "battery_3aa",
    label: "3 AA batteries",
    hint: "Common and easy to find. Good for projects you carry around.",
  },
  {
    value: "battery_18650",
    label: "18650 battery",
    hint: "A rechargeable cell that lasts a long time. Handle with care.",
  },
];

export function powerChoiceLabel(source: PowerSource | null): string {
  return POWER_CHOICES.find((choice) => choice.value === source)?.label ?? "Not set";
}

type PowerSelectorProps = {
  value: PowerSource | null;
  onChange: (value: PowerSourceValue) => void;
};

/** Compact "Powered by" dropdown. A native select keeps keyboard and phone behavior right. */
export function PowerSelector({ value, onChange }: PowerSelectorProps) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
      <span className="shrink-0">Powered by</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const next = POWER_CHOICES.find((choice) => choice.value === event.target.value);
          if (next) onChange(next.value);
        }}
        className="min-h-11 min-w-0 rounded-xl border border-line-strong bg-white px-3 text-sm font-medium text-ink hover:border-copper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
      >
        {value === null ? (
          <option value="" disabled>
            Not set, pick one
          </option>
        ) : null}
        {POWER_CHOICES.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
}
