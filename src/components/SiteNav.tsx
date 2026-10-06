"use client";

import { useEffect, useState } from "react";
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

  return (
    <header
      className="site-nav"
      data-visible={visible}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6 sm:px-10 lg:px-16">
        <ScrollLink targetId="top" className="brand-mark shrink-0 text-base sm:text-lg">
          HelpmeSolder
        </ScrollLink>
        <nav aria-label="Sections" className="flex items-center gap-3 sm:gap-6">
          {LINKS.map((link) => (
            <ScrollLink
              key={link.id}
              targetId={link.id}
              className="site-nav__link"
              current={active === link.id}
            >
              {link.label}
            </ScrollLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
