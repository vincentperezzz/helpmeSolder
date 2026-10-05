"use client";

import { useRef, type KeyboardEvent } from "react";
import { TAB_IDS, TAB_LABELS, nextTab, type TabId } from "./model";

export const tabDomId = (prefix: string, tab: TabId) => `${prefix}-tab-${tab}`;
export const panelDomId = (prefix: string, tab: TabId) => `${prefix}-panel-${tab}`;

type PanelTabsProps = {
  prefix: string;
  tab: TabId;
  onChange: (tab: TabId) => void;
  counts: Partial<Record<TabId, number>>;
};

/** Tab bar with roving tabindex. Arrow keys, Home and End move and activate. */
export function PanelTabs({ prefix, tab, onChange, counts }: PanelTabsProps) {
  const buttons = useRef(new Map<TabId, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = nextTab(tab, event.key);
    if (!target) return;
    event.preventDefault();
    onChange(target);
    buttons.current.get(target)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Build guide sections"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      data-print-hide="true"
      className="ga-tabs"
    >
      {TAB_IDS.map((id) => {
        const selected = id === tab;
        const count = counts[id];
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
            className="ga-tab"
          >
            {TAB_LABELS[id]}
            {count ? <span className="ga-badge">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
