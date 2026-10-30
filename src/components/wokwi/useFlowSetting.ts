"use client";

import { useCallback, useEffect, useState } from "react";

const FLOW_KEY = "helpmesolder:flow";

/** True when the OS asks for less motion; the flow animation then stays off. */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * The "Show current" toggle, remembered per browser. Off by default, and
 * unavailable when the viewer prefers reduced motion.
 */
export function useFlowSetting(): { flow: boolean; reduced: boolean; toggle: () => void } {
  const [flow, setFlow] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const noMotion = prefersReducedMotion();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(noMotion);
    try {
      setFlow(!noMotion && window.localStorage.getItem(FLOW_KEY) === "1");
    } catch {
      // Storage can be blocked; the toggle still works for this visit.
    }
  }, []);

  const toggle = useCallback(() => {
    setFlow((current) => {
      const next = !current;
      try {
        if (next) window.localStorage.setItem(FLOW_KEY, "1");
        else window.localStorage.removeItem(FLOW_KEY);
      } catch {
        // Ignore blocked storage.
      }
      return next;
    });
  }, []);

  return { flow: flow && !reduced, reduced, toggle };
}
