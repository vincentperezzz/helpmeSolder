"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { TAB_ICONS } from "./icons";
import { TAB_IDS, TAB_LABELS, nextTab, type TabId } from "./model";
import "./panel-tabs.css";

export const tabDomId = (prefix: string, tab: TabId) => `${prefix}-tab-${tab}`;
export const panelDomId = (prefix: string, tab: TabId) => `${prefix}-panel-${tab}`;

type PanelTabsProps = {
  prefix: string;
  tab: TabId;
  onChange: (tab: TabId) => void;
  counts: Partial<Record<TabId, number>>;
};

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Tab bar with roving tabindex. Arrow keys, Home and End move and activate.
 * A single pill slides behind the active tab; counts are quiet superscripts.
 */
export function PanelTabs({ prefix, tab, onChange, counts }: PanelTabsProps) {
  const buttons = useRef(new Map<TabId, HTMLButtonElement>());
  const list = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const placePill = useCallback(() => {
    const node = list.current;
    const active = buttons.current.get(tab);
    if (!node || !active) return;
    node.style.setProperty("--ptab-x", `${active.offsetLeft}px`);
    node.style.setProperty("--ptab-w", `${active.offsetWidth}px`);
  }, [tab]);

  // Enable the slide only after the first placement, so the pill never glides in from the left.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useIsoLayoutEffect(() => {
    placePill();
    const active = buttons.current.get(tab);
    // Keep the active tab in view when the bar scrolls (narrow widths).
    active?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [placePill, tab]);

  useEffect(() => {
    const node = list.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(placePill);
    observer.observe(node);
    buttons.current.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [placePill]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = nextTab(tab, event.key);
    if (!target) return;
    event.preventDefault();
    onChange(target);
    buttons.current.get(target)?.focus();
  }

  return (
    <div className="ptabs-wrap" data-print-hide="true">
      <div
        ref={list}
        role="tablist"
        aria-label="Build guide sections"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        data-ready={ready}
        className="ptabs"
      >
        <span aria-hidden className="ptabs-pill" />
        {TAB_IDS.map((id) => {
          const selected = id === tab;
          const count = counts[id];
          const Icon = TAB_ICONS[id];
          return (
            <button
              key={id}
              ref={(node) => {
                if (node) buttons.current.set(id, node);
                else buttons.current.delete(id);
              }}
              type="button"
              role="tab"
              id={tabDomId(prefix, id)}
              aria-selected={selected}
              aria-controls={panelDomId(prefix, id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(id)}
              className="ptab"
            >
              <Icon size={18} />
              <span className="ptab-label">
                <span className="ptab-text">{TAB_LABELS[id]}</span>
                {count ? (
                  <>
                    {" "}
                    <span className="ptab-count">{count}</span>
                  </>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
