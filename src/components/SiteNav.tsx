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

  useEffect(() => {
    function update(): void {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
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
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6 sm:px-10 lg:px-16">
        <ScrollLink targetId="top" className="brand-mark text-lg">
          HelpmeSolder
        </ScrollLink>
        <nav aria-label="Sections" className="flex items-center gap-3 sm:gap-5 lg:gap-6">
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
