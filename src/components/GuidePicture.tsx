"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const MOBILE_QUERY = "(max-width: 1023px)";

/** The real sample guide: a read-only picture and its wire list, linked by hover, tap, and scroll. */
export function GuidePicture() {
  const wires = useMemo(() => buildSolderItems(EXAMPLE_GUIDE), []);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const pictureRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    let frame = 0;

    function pick(): void {
      frame = 0;
      if (!media.matches) {
        return;
      }
      const list = listRef.current;
      const picture = pictureRef.current;
      if (!list) {
        return;
      }
      const rows = [...list.querySelectorAll<HTMLElement>("[data-wire-id]")];
      const pictureBottom = picture?.getBoundingClientRect().bottom ?? 56;
      const line = pictureBottom + Math.max(48, (window.innerHeight - pictureBottom) * 0.42);
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (rect.bottom <= pictureBottom) {
          continue;
        }
        if (rect.top >= window.innerHeight) {
          continue;
        }
        const mid = rect.top + Math.min(rect.height, 72) / 2;
        const dist = Math.abs(mid - line);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = row.dataset.wireId ?? null;
        }
      }
      if (!bestId && rows.length) {
        const last = rows[rows.length - 1];
        if (last.getBoundingClientRect().top < line) {
          bestId = last.dataset.wireId ?? null;
        }
      }
      setFocusId((current) => (current === bestId ? current : bestId));
    }

    function onScroll(): void {
      if (!frame) {
        frame = requestAnimationFrame(pick);
      }
    }

    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    media.addEventListener("change", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      media.removeEventListener("change", onScroll);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [wires]);

  return (
    <div className="sample">
      <InView className="sample__picture snippet-frame">
        <figure
          ref={pictureRef}
          className="sample__stage"
          aria-label={`${EXAMPLE_GUIDE.title} wiring picture`}
        >
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
        <ol ref={listRef} className="wire-list">
          {wires.map((item, index) => {
            const number = index + 1;
            const selected = focusId === item.id;
            const hot = hoverId === item.id || selected;
            return (
              <li
                key={item.id}
                data-wire-id={item.id}
                className={`wire-row${selected ? " is-selected" : ""}${hot ? " is-hot" : ""}`}
                onMouseEnter={() => setHoverId(item.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-expanded={selected}
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
