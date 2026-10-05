"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { SchematicDiagram } from "@/components/schematic/SchematicDiagram";
import { readPrintSchematic, writePrintSchematic } from "@/components/guide/view-storage";
import type { Guide } from "@/lib/catalog/types";
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
  document.querySelectorAll<HTMLDetailsElement>(".guide-app details").forEach((el) => {
    if (!el.open) {
      el.open = true;
      opened.push(el);
    }
  });
  state.openedDetails.push(...opened);

  // Lazy images that are off screen would otherwise print blank.
  document.querySelectorAll<HTMLImageElement>(".guide-app img[loading='lazy']").forEach((img) => {
    img.loading = "eager";
  });

  // Date line next to the brand name in the top bar, read by print.css.
  const stamp = document.querySelector<HTMLElement>(".guide-app .ga-brand");
  if (stamp) {
    stamp.setAttribute(
      "data-printed",
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    );
    state.stampedEl = stamp;
  }

  // The wiring picture is a big canvas scaled with a CSS transform. Work out a
  // scale and box shape that fit the page, and hand them to print.css.
  const viewport = document.querySelector<HTMLElement>(".guide-app .diagram-viewport");
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

type PrintButtonProps = {
  /** The guide as drawn. Needed for the "Include schematic" choice. */
  guide?: Guide;
};

export function PrintButton({ guide }: PrintButtonProps) {
  const guideId = guide?.id;
  const [withSchematic, setWithSchematic] = useState(false);
  const [stage, setStage] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Read after mount so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guideId) setWithSchematic(readPrintSchematic(guideId));
    setStage(document.querySelector<HTMLElement>(".guide-app .ga-stage"));
  }, [guideId]);

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
    <>
      {guide ? (
        <label data-print-hide="true" className="ga-print-choice">
          <input
            type="checkbox"
            checked={withSchematic}
            onChange={(event) => {
              setWithSchematic(event.target.checked);
              writePrintSchematic(guide.id, event.target.checked);
            }}
          />
          <span>Include schematic</span>
        </label>
      ) : null}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Print this guide"
        data-print-button
        className="ga-btn print:hidden"
      >
        Print
      </button>
      {guide && withSchematic && stage
        ? createPortal(
            <div className="print-only-schematic" aria-hidden="true" inert>
              <h2>Circuit schematic</h2>
              <SchematicDiagram guide={guide} />
            </div>,
            stage,
          )
        : null}
    </>
  );
}
