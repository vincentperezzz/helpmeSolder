"use client";

import { useId } from "react";
import { Switch } from "@/components/guide/Switch";

type LayoutToggleProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

const HINT =
  "A breadboard lets you plug parts in with no soldering. Turn it off to see the wires go straight from part to part.";

/** Compact view-only switch: show the wiring on a breadboard or as direct wires. */
export function LayoutToggle({ checked, onChange }: LayoutToggleProps) {
  const hintId = useId();
  return (
    <Switch checked={checked} onChange={onChange} hint={HINT} hintId={hintId}>
      Breadboard
    </Switch>
  );
}
