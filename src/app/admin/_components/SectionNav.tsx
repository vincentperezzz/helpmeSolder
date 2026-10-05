"use client";

import { useEffect, useRef, useState } from "react";

export type SectionNavItem = {
  /** Id of the element to jump to, without the #. */
  id: string;
  label: string;
  /** Number shown next to the label. */
  count?: number;
  /** Parts needing attention. 0 shows a done mark, above 0 shows an amber pill. */
  missing?: number;
};

/**
 * Jump links for a long page. A sticky sidebar from lg up, a sticky scrollable chip row below.
 * Without JavaScript the links still work as plain anchors.
 */
export function SectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const visible = useRef(new Set<string>());

  useEffect(() => {
    const order = items.map((i) => i.id);
    const targets = order
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;

    const seen = visible.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) seen.add(entry.target.id);
          else seen.delete(entry.target.id);
        }
        const first = order.find((id) => seen.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    for (const el of targets) observer.observe(el);
    return () => {
      observer.disconnect();
      seen.clear();
    };
  }, [items]);

  // Keep the active chip in view inside the horizontal row on phones.
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!active || !list || list.scrollWidth <= list.clientWidth) return;
    const link = list.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!link) return;
    const left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left) });
  }, [active]);

  return (
    <>
      <style>{"@media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth}}"}</style>
      <nav
        aria-label={label}
        className="sticky top-0 z-20 -mx-4 border-b border-line bg-paper px-4 py-2 sm:-mx-6 sm:px-6 lg:top-4 lg:mx-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:border-b-0 lg:px-0 lg:py-0"
      >
        <ul
          ref={listRef}
          className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-x-visible"
        >
          {items.map((item) => {
            const current = item.id === active;
            return (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "true" : undefined}
                  onClick={() => setActive(item.id)}
                  className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper lg:justify-between ${
                    current
                      ? "border-copper bg-white font-semibold text-ink"
                      : "border-line text-ink-soft hover:bg-paper-deep hover:text-ink lg:border-transparent"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="flex items-center gap-1.5">
                    {item.count !== undefined ? (
                      <span className="text-xs tabular-nums text-mute">{item.count}</span>
                    ) : null}
                    {item.missing === undefined ? null : item.missing === 0 ? (
                      <span className="text-xs text-flux">
                        <span aria-hidden="true">&#10003; </span>complete
                      </span>
                    ) : (
                      <span className="rounded-full border border-warn-line bg-warn-bg px-1.5 text-xs text-warn-ink">
                        {item.missing} missing
                      </span>
                    )}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
