"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SectionNavItem = {
  /** Id of the element to jump to, without the #. */
  id: string;
  label: string;
  /** Number shown next to the label. */
  count?: number;
  /** Parts needing attention. 0 shows a done mark, above 0 shows an amber pill. */
  missing?: number;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function shortLabel(text: string, max = 16) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function ItemBadges({ item }: { item: SectionNavItem }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {item.count !== undefined ? (
        <span className="min-w-6 text-right text-xs tabular-nums text-mute">{item.count}</span>
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
  );
}

/**
 * Jump links for a long page. A sticky sidebar from lg up. Below lg a floating
 * Categories button opens a right-hand drawer with the same list.
 */
export function SectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const visible = useRef(new Set<string>());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

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

  const close = useCallback(() => setOpen(false), []);

  // Focus, scroll lock and Escape while the drawer is open.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) buttonRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      const inside = drawerRef.current?.contains(current) ?? false;
      if (event.shiftKey && (current === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previous;
    };
  }, [open]);

  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    setActive(id);
    const target = document.getElementById(id);
    if (!open || !target) return; // desktop: plain anchor with CSS smooth scroll
    event.preventDefault();
    setOpen(false);
    const smooth = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    // Wait a frame so the scroll lock is released before scrolling.
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      history.replaceState(null, "", `#${id}`);
    });
  }

  const activeItem = items.find((i) => i.id === active);

  const linkClass = (current: boolean, size: string) =>
    `flex ${size} items-center justify-between gap-2 rounded-md border-l-[3px] px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper ${
      current
        ? "border-copper bg-white font-semibold text-ink"
        : "border-transparent text-ink-soft hover:bg-paper-deep hover:text-ink"
    }`;

  return (
    <>
      <style>{`@media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth}}
@media (prefers-reduced-motion: reduce){.catalog-drawer,.catalog-backdrop{transition:none!important}}`}</style>

      <nav
        aria-label={label}
        className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
      >
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={item.id === active ? "true" : undefined}
                onClick={(e) => jump(e, item.id)}
                className={linkClass(item.id === active, "min-h-11 text-sm")}
              >
                <span className="min-w-0">{item.label}</span>
                <ItemBadges item={item} />
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="catalog-drawer"
        onClick={() => setOpen(true)}
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))", right: "1rem" }}
        className={`fixed z-30 flex min-h-12 items-center gap-2 rounded-full bg-ink px-4 text-paper shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper lg:hidden ${
          open ? "invisible" : ""
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
        <span className="text-sm font-semibold">Categories</span>
        {activeItem ? (
          <span className="text-xs text-paper/70">{shortLabel(activeItem.label)}</span>
        ) : null}
      </button>

      <div className="lg:hidden">
        <div
          aria-hidden="true"
          onClick={close}
          className={`catalog-backdrop fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <div
          ref={drawerRef}
          id="catalog-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Catalog categories"
          inert={!open}
          style={{ width: "min(88vw, 360px)", transitionDuration: "220ms" }}
          className={`catalog-drawer fixed inset-y-0 right-0 z-50 flex flex-col border-l border-line bg-paper shadow-2xl transition-transform ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <h2 className="font-display text-lg font-bold text-ink">Categories</h2>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close categories"
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-paper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={item.id === active ? "true" : undefined}
                  onClick={(e) => jump(e, item.id)}
                  className={linkClass(item.id === active, "min-h-12 text-base")}
                >
                  <span className="min-w-0">{item.label}</span>
                  <ItemBadges item={item} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
