"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { SchematicDiagram } from "@/components/schematic/SchematicDiagram";
import { readPrintSchematic, writePrintSchematic } from "@/components/guide/view-storage";
import type { Guide } from "@/lib/catalog/types";
import "./print.css";

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
  const opened: HTMLDetailsElement[] = [];
  document.querySelectorAll<HTMLDetailsElement>(".guide-app details").forEach((el) => {
    if (!el.open) {
      el.open = true;
      opened.push(el);
    }
  });
  state.openedDetails.push(...opened);

  document.querySelectorAll<HTMLImageElement>(".guide-app img[loading='lazy']").forEach((img) => {
    img.loading = "eager";
  });

  const stamp = document.querySelector<HTMLElement>(".guide-app .ga-brand");
  if (stamp) {
    stamp.setAttribute(
      "data-printed",
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    );
    state.stampedEl = stamp;
  }

  const viewport = document.querySelector<HTMLElement>(".guide-app .diagram-viewport");
  const world = viewport?.querySelector<HTMLElement>(".diagram-world");
  if (viewport && world && world.offsetWidth > 0 && world.offsetHeight > 0) {
    const worldW = world.offsetWidth;
    const worldH = world.offsetHeight;
    const available =
      viewport.clientWidth > 0 ? Math.min(viewport.clientWidth, PRINT_PICTURE_WIDTH) : PRINT_PICTURE_WIDTH;
    const scale = Math.min(1, available / worldW);
    viewport.style.setProperty("--print-world-w", String(worldW));
    viewport.style.setProperty("--print-world-h", String(worldH));
    viewport.style.setProperty("--print-scale", String(scale));
    viewport.style.setProperty("--print-ratio", `${worldW} / ${worldH}`);
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
  state.viewport?.style.removeProperty("--print-world-w");
  state.viewport?.style.removeProperty("--print-world-h");
  state.viewport?.style.removeProperty("--print-scale");
  state.viewport?.style.removeProperty("--print-ratio");
  state.viewport = null;
}

type PrintButtonProps = {
  guide?: Guide;
};

export function PrintButton({ guide }: PrintButtonProps) {
  const guideId = guide?.id;
  const hintId = useId();
  const [withSchematic, setWithSchematic] = useState(false);
  const [stage, setStage] = useState<HTMLElement | null>(null);

  useEffect(() => {
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
    const state = stateRef.current;
    restorePage(state);
    preparePage(state);
    window.print();
  }

  return (
    <>
      {guide ? (
        <div data-print-hide="true" className="ga-print-choice">
          <label className="ga-print-choice-label">
            <input
              type="checkbox"
              checked={withSchematic}
              aria-describedby={hintId}
              onChange={(event) => {
                setWithSchematic(event.target.checked);
                writePrintSchematic(guide.id, event.target.checked);
              }}
            />
            <span>Include schematic</span>
          </label>
          <p id={hintId} className="ga-print-choice-hint">
            Adds the circuit schematic to the printed guide.
          </p>
        </div>
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
