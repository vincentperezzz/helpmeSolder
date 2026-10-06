"use client";

import { useMemo, useState } from "react";
import { pinName } from "@/components/guide/model";
import { InView } from "@/components/InView";
import { WokwiDiagram } from "@/components/WokwiDiagram";
import { badgeTextColor } from "@/components/wokwi/badges";
import { EXAMPLE_GUIDE, EXAMPLE_LINK_ID } from "@/lib/home/example-guide";
import { buildSolderItems } from "@/lib/guides/solder-plan";

function Arrow() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/** The real sample guide: a read-only picture and its wire list, linked by hover and tap. */
export function GuidePicture() {
  const wires = useMemo(() => buildSolderItems(EXAMPLE_GUIDE), []);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  return (
    <div className="sample">
      <InView className="sample__picture snippet-frame">
        <figure className="sample__stage" aria-label={`${EXAMPLE_GUIDE.title} wiring picture`}>
          <WokwiDiagram
            guide={EXAMPLE_GUIDE}
            chrome={false}
            hoveredWireId={hoverId}
            onHoverWire={setHoverId}
            focusedWireIds={focusId ? [focusId] : null}
            onSelectWire={setFocusId}
          />
        </figure>
      </InView>

      <div className="sample__side">
        <ol className="wire-list">
          {wires.map((item, index) => {
            const number = index + 1;
            const selected = focusId === item.id;
            const hot = hoverId === item.id || selected;
            return (
              <li
                key={item.id}
                className={`wire-row${selected ? " is-selected" : ""}${hot ? " is-hot" : ""}`}
                onMouseEnter={() => setHoverId(item.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Wire ${number}: ${item.sentence}. Show in the picture.`}
                  onClick={() => setFocusId(selected ? null : item.id)}
                  onFocus={() => setHoverId(item.id)}
                  onBlur={() => setHoverId(null)}
                >
                  <span
                    aria-hidden
                    className="wire-row__badge"
                    style={{ backgroundColor: item.color, color: badgeTextColor(item.color) }}
                  >
                    {number}
                  </span>
                  <span className="wire-row__body">
                    <span className="wire-row__route">
                      <span className="wire-row__end">
                        <span className="wire-row__part">{item.from.part}</span>
                        <strong>{pinName(item.from.pin)}</strong>
                      </span>
                      <span className="wire-row__arrow" aria-hidden>
                        <Arrow />
                      </span>
                      <span className="wire-row__end">
                        <span className="wire-row__part">{item.to.part}</span>
                        <strong>{pinName(item.to.pin)}</strong>
                      </span>
                    </span>
                    <span className="wire-row__chip">
                      <span
                        aria-hidden
                        className="wire-row__swatch"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.colorName} wire
                    </span>
                  </span>
                </button>
                {item.why ? (
                  <div className="wire-row__why" aria-hidden={!hot}>
                    <p>
                      <span>{item.why}</span>
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="sample__link">
          A wiring guide, not a working circuit. Your link looks like{" "}
          <span>/guides/{EXAMPLE_LINK_ID}</span>
        </p>
      </div>
    </div>
  );
}
