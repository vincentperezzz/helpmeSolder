"use client";

import { useState } from "react";
import { CloseIcon, DockIcon, ShowPanelIcon, TAB_ICONS } from "./icons";
import { TAB_IDS, TAB_LABELS, type TabId } from "./model";

type MobileDockProps = {
  onOpen: (tab: TabId) => void;
  onExit: () => void;
};

/**
 * Small screens, picture full screen: a slim pill of icon buttons on the right
 * edge. Each opens its tab as a bottom sheet. CSS shows it only in that state.
 */
export function MobileDock({ onOpen, onExit }: MobileDockProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="ga-dock" data-print-hide="true" role="toolbar" aria-label="Guide sections">
      {open
        ? TAB_IDS.map((id) => {
            const Glyph = TAB_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                className="ga-dock-btn"
                aria-label={`Open ${TAB_LABELS[id]}`}
                title={TAB_LABELS[id]}
                onClick={() => onOpen(id)}
              >
                <Glyph />
              </button>
            );
          })
        : null}
      {open ? (
        <button
          type="button"
          className="ga-dock-btn"
          aria-label="Show panel"
          title="Show panel"
          onClick={onExit}
        >
          <ShowPanelIcon />
        </button>
      ) : null}
      <button
        type="button"
        className="ga-dock-btn"
        aria-label={open ? "Collapse shortcuts" : "Show shortcuts"}
        aria-expanded={open}
        title={open ? "Collapse shortcuts" : "Show shortcuts"}
        onClick={() => setOpen(!open)}
      >
        {open ? <CloseIcon /> : <DockIcon />}
      </button>
    </div>
  );
}
