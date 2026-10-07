"use client";

import { useEffect, useId, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ScrollLink } from "@/components/ScrollLink";

const LINKS = [
  { id: "example", label: "Sample" },
  { id: "how", label: "How" },
  { id: "setup", label: "Setup" },
  { id: "tools", label: "Tools" },
];

export function SiteNav() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  // Show the bar once the sentinel near the end of the hero has scrolled above the viewport.
  useEffect(() => {
    const sentinel = document.querySelector("[data-nav-sentinel]");
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const link of LINKS) {
      const section = document.getElementById(link.id);
      if (section) {
        observer.observe(section);
      }
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!visible) {
      setMenuOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  function closeMenu(): void {
    setMenuOpen(false);
  }

  return (
    <>
      <header
        className="site-nav px-6 sm:px-10 lg:px-16"
        data-visible={visible}
        data-open={menuOpen}
        aria-hidden={!visible}
        inert={!visible}
      >
        <div className="site-nav__bar mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4">
          <ScrollLink
            targetId="top"
            className="brand-mark inline-flex items-center gap-2.5 shrink-0 text-base sm:text-lg"
            onClick={closeMenu}
          >
            <BrandLogo
              size={22}
              className="shrink-0 rounded-[5px] transition-transform duration-200 hover:scale-105"
            />
            <span>HelpmeSolder</span>
          </ScrollLink>
          <button
            type="button"
            className="site-nav__toggle"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="site-nav__toggle-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <nav id={menuId} aria-label="Sections" className="site-nav__links">
            <div className="site-nav__panel">
              {LINKS.map((link) => (
                <ScrollLink
                  key={link.id}
                  targetId={link.id}
                  className="site-nav__link"
                  current={active === link.id}
                  onClick={closeMenu}
                >
                  {link.label}
                </ScrollLink>
              ))}
            </div>
          </nav>
        </div>
      </header>
      <button
        type="button"
        className="site-nav__dismiss"
        aria-label="Close menu"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />
    </>
  );
}
