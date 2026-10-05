"use client";

import { useEffect } from "react";

/** Sends one anonymous visit ping per browser tab session. Renders nothing. */
export function VisitBeacon() {
  useEffect(() => {
    try {
      if (typeof navigator.sendBeacon !== "function") return;
      if (navigator.doNotTrack === "1") return;
      if (sessionStorage.getItem("hms-hit")) return;
      sessionStorage.setItem("hms-hit", "1");
    } catch {
      // Storage blocked: skip rather than ping on every page.
      return;
    }
    navigator.sendBeacon("/api/hit");
  }, []);
  return null;
}
