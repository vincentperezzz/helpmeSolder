"use client";

import { useState } from "react";
import { CloseIcon, DockIcon, ShowPanelIcon, TAB_ICONS } from "./icons";
import { TAB_IDS, TAB_LABELS, type TabId } from "./model";

type MobileDockProps = {
  onOpen: (tab: TabId) => void;
  onExit: () => void;
};

/**
 * Small screens, picture full screen: a horizontal pill of icon buttons along the
 * bottom edge, anchored to a round menu button at the bottom-right. Collapsed it is
 * just that button; opening grows the pill leftwards out of it. Each icon opens its
 * tab as a bottom sheet. CSS shows it only in that state.
 */
export function MobileDock({ onOpen, onExit }: MobileDockProps) {
  const [open, setOpen] = useState(true);
  return (
    <div
      className="ga-dock"
      data-open={open ? "true" : "false"}
      data-print-hide="true"
      role="toolbar"
      aria-label="Guide sections"
    >
      <div className="ga-dock-pill">
        <div className="ga-dock-items" inert={!open}>
          {TAB_IDS.map((id, i) => {
            const Glyph = TAB_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                className="ga-dock-btn ga-dock-item"
                style={{ "--i": i } as React.CSSProperties}
                aria-label={`Open ${TAB_LABELS[id]}`}
                title={TAB_LABELS[id]}
                onClick={() => onOpen(id)}
              >
                <Glyph />
              </button>
            );
          })}
          <button
            type="button"
            className="ga-dock-btn ga-dock-item"
            style={{ "--i": TAB_IDS.length } as React.CSSProperties}
            aria-label="Show panel"
            title="Show panel"
            onClick={onExit}
          >
            <ShowPanelIcon />
          </button>
        </div>
        <button
          type="button"
          className="ga-dock-btn ga-dock-toggle"
          aria-label={open ? "Hide shortcuts" : "Show shortcuts"}
          aria-expanded={open}
          title={open ? "Hide shortcuts" : "Show shortcuts"}
          onClick={() => setOpen(!open)}
        >
          <span className="ga-dock-glyph ga-dock-glyph-menu"><DockIcon /></span>
          <span className="ga-dock-glyph ga-dock-glyph-close"><CloseIcon /></span>
        </button>
      </div>
    </div>
  );
}
