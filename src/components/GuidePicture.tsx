"use client";

import { useMemo, useState } from "react";
import { pinName } from "@/components/guide/model";
import { InView } from "@/components/InView";
import { WokwiDiagram } from "@/components/WokwiDiagram";
import { badgeTextColor } from "@/components/wokwi/badges";
import { EXAMPLE_GUIDE } from "@/lib/home/example-guide";
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

export function GuidePicture() {
  const wires = useMemo(() => buildSolderItems(EXAMPLE_GUIDE), []);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  return (
    <div className="proof-card snippet-frame">
      <InView className="proof-picture">
        <figure
          className="proof-card__stage"
          aria-label={`${EXAMPLE_GUIDE.title} wiring picture`}
        >
          <WokwiDiagram
            guide={EXAMPLE_GUIDE}
            hoveredWireId={hoverId}
            onHoverWire={setHoverId}
            focusedWireIds={focusId ? [focusId] : null}
            onSelectWire={setFocusId}
          />
        </figure>
      </InView>
      <ol className="proof-card__wires">
        {wires.map((item, index) => {
          const number = index + 1;
          const selected = focusId === item.id;
          const hot = hoverId === item.id && !selected;
          return (
            <li
              key={item.id}
              className={`proof-wire${selected ? " is-selected" : ""}${hot ? " is-hot" : ""}`}
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
                  className="proof-wire__badge"
                  style={{ backgroundColor: item.color, color: badgeTextColor(item.color) }}
                >
                  {number}
                </span>
                <span className="proof-wire__text">
                  <span className="proof-wire__route">
                    <span className="proof-wire__end">
                      <span className="proof-wire__part">{item.from.part}</span>
                      <strong>{pinName(item.from.pin)}</strong>
                    </span>
                    <span className="proof-wire__arrow" aria-hidden>
                      <Arrow />
                    </span>
                    <span className="proof-wire__end">
                      <span className="proof-wire__part">{item.to.part}</span>
                      <strong>{pinName(item.to.pin)}</strong>
                    </span>
                  </span>
                  <span className="proof-wire__chip">
                    <span
                      aria-hidden
                      className="proof-wire__swatch"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.colorName} wire
                  </span>
                  {item.why ? <span className="proof-wire__why">{item.why}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
