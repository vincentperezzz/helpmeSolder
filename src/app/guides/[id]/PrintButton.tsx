"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { SchematicDiagram } from "@/components/schematic/SchematicDiagram";
import {
  DEFAULT_PRINT_OPTIONS,
  PRINT_GROUPS,
  PRINT_SECTION_LABELS,
  PRINT_SECTIONS,
  readPrintOptions,
  setAllPrintOptions,
  writePrintOptions,
  type PrintOptions,
  type PrintSection,
} from "@/components/guide/view-storage";
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
  app: HTMLElement | null;
};

function applyPrintFlags(app: HTMLElement | null, options: PrintOptions) {
  if (!app) return;
  for (const key of PRINT_SECTIONS) {
    app.setAttribute(`data-print-${key}`, options[key] ? "on" : "off");
  }
}

function clearPrintFlags(app: HTMLElement | null) {
  if (!app) return;
  for (const key of PRINT_SECTIONS) {
    app.removeAttribute(`data-print-${key}`);
  }
}

function preparePage(state: PrintState, options: PrintOptions) {
  const app = document.querySelector<HTMLElement>(".guide-app");
  state.app = app;
  applyPrintFlags(app, options);

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

  if (!options.diagram) return;

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
  clearPrintFlags(state.app);
  state.app = null;
}

type PrintButtonProps = {
  guide?: Guide;
};

export function PrintButton({ guide }: PrintButtonProps) {
  const guideId = guide?.id;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PrintOptions>(DEFAULT_PRINT_OPTIONS);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guideId) setOptions(readPrintOptions(guideId));
    setStage(document.querySelector<HTMLElement>(".guide-app .ga-stage"));
  }, [guideId]);

  const canPrint = useSyncExternalStore(noopSubscribe, canPrintNow, canPrintOnServer);
  const stateRef = useRef<PrintState>({
    openedDetails: [],
    stampedEl: null,
    viewport: null,
    app: null,
  });

  useEffect(() => {
    const state = stateRef.current;
    const before = () => preparePage(state, optionsRef.current);
    const after = () => restorePage(state);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!canPrint) return null;

  const selected = PRINT_SECTIONS.filter((section) => options[section]).length;

  function commit(next: PrintOptions) {
    setOptions(next);
    if (guideId) writePrintOptions(guideId, next);
  }

  function setSection(section: PrintSection, value: boolean) {
    commit({ ...options, [section]: value });
  }

  function finalizePrint() {
    const state = stateRef.current;
    restorePage(state);
    preparePage(state, optionsRef.current);
    setOpen(false);
    window.print();
  }

  return (
    <>
      <div ref={rootRef} data-print-hide="true" className="ga-print">
        <button
          type="button"
          className="ga-btn ga-print-trigger"
          aria-label="Print options"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          Print
          <span aria-hidden className="ga-print-caret">
            {open ? "▴" : "▾"}
          </span>
        </button>
        {open ? (
          <div
            id={menuId}
            role="dialog"
            aria-label="Choose what to print"
            className="ga-print-menu"
          >
            <div className="ga-print-menu-head">
              <p className="ga-print-menu-title">Include in print</p>
              <div className="ga-print-menu-actions">
                <button
                  type="button"
                  className="ga-print-menu-link"
                  onClick={() => commit(setAllPrintOptions(true))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="ga-print-menu-link"
                  onClick={() => commit(setAllPrintOptions(false))}
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="ga-print-menu-hint" aria-live="polite">
              {selected} of {PRINT_SECTIONS.length} selected. Remembered for this guide.
            </p>
            {PRINT_GROUPS.map((group) => (
              <fieldset key={group.label} className="ga-print-menu-group">
                <legend className="ga-print-menu-legend">{group.label}</legend>
                {group.sections.map((section) => (
                  <label key={section} className="ga-print-menu-item">
                    <input
                      type="checkbox"
                      className="ga-check-input"
                      checked={options[section]}
                      onChange={(event) => setSection(section, event.target.checked)}
                    />
                    <span aria-hidden className="ga-check-box">
                      <svg viewBox="0 0 12 12" focusable="false">
                        <path d="M2.5 6.4 5 8.9l4.6-5.3" />
                      </svg>
                    </span>
                    <span>{PRINT_SECTION_LABELS[section]}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            <button
              type="button"
              className="ga-print-menu-go"
              disabled={selected === 0}
              onClick={finalizePrint}
            >
              Print
            </button>
          </div>
        ) : null}
      </div>
      {guide && options.schematic && stage
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
