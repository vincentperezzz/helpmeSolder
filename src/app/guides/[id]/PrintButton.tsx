"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import "./print.css";

// Width in CSS pixels that the wiring picture is scaled to. A4 and Letter with
// 12 mm margins leave about 703 px and 725 px, so this fits both.
const PRINT_PICTURE_WIDTH = 680;

const noopSubscribe = () => () => {};
const canPrintNow = () => typeof window.print === "function";
const canPrintOnServer = () => true;

type PrintState = {
  openedDetails: HTMLDetailsElement[];
  stampedEl: HTMLElement | null;
  viewport: HTMLElement | null;
};

function preparePage(state: PrintState) {
  // Open every <details> (the soldering how-to) so it prints in full.
  const opened: HTMLDetailsElement[] = [];
  document.querySelectorAll<HTMLDetailsElement>(".guide-shell details").forEach((el) => {
    if (!el.open) {
      el.open = true;
      opened.push(el);
    }
  });
  state.openedDetails.push(...opened);

  // Lazy images that are off screen would otherwise print blank.
  document.querySelectorAll<HTMLImageElement>(".guide-shell img[loading='lazy']").forEach((img) => {
    img.loading = "eager";
  });

  // Date line next to the brand name in the header, read by print.css.
  const stamp = document.querySelector<HTMLElement>(".guide-shell > header p.brand-mark");
  if (stamp) {
    stamp.setAttribute(
      "data-printed",
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    );
    state.stampedEl = stamp;
  }

  // The wiring picture is a big canvas scaled with a CSS transform. Work out a
  // scale and box shape that fit the page, and hand them to print.css.
  const viewport = document.querySelector<HTMLElement>(".guide-shell .diagram-viewport");
  const world = viewport?.querySelector<HTMLElement>(".diagram-world");
  if (viewport && world && world.offsetWidth > 0 && world.offsetHeight > 0) {
    const scale = Math.min(1, PRINT_PICTURE_WIDTH / world.offsetWidth);
    viewport.style.setProperty("--print-scale", String(scale));
    viewport.style.setProperty("--print-ratio", `${world.offsetWidth} / ${world.offsetHeight}`);
    state.viewport = viewport;
  }
}

function restorePage(state: PrintState) {
  state.openedDetails.forEach((el) => {
    el.open = false;
  });
  state.openedDetails = [];
  state.stampedEl?.removeAttribute("data-printed");
  state.stampedEl = null;
  state.viewport?.style.removeProperty("--print-scale");
  state.viewport?.style.removeProperty("--print-ratio");
  state.viewport = null;
}

export function PrintButton() {
  const canPrint = useSyncExternalStore(noopSubscribe, canPrintNow, canPrintOnServer);
  const stateRef = useRef<PrintState>({ openedDetails: [], stampedEl: null, viewport: null });

  useEffect(() => {
    const state = stateRef.current;
    const before = () => preparePage(state);
    const after = () => restorePage(state);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  if (!canPrint) return null;

  function handleClick() {
    // Prepare first in case the browser does not fire beforeprint for
    // window.print(). Nothing here depends on it running twice.
    const state = stateRef.current;
    restorePage(state);
    preparePage(state);
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Print this guide"
      data-print-button
      className="border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-copper hover:text-copper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux print:hidden"
    >
      Print this guide
    </button>
  );
}
