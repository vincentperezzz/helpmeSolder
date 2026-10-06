"use client";

import { useEffect, useRef, type ReactNode } from "react";

type InViewProps = {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  children: ReactNode;
};

/**
 * Arms `data-state="armed"` once mounted and flips to "in" when the block
 * scrolls into view. Without JS or with reduced motion it stays unmarked,
 * which is the fully drawn state.
 */
export function InView({ className, style, id, children }: InViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    element.dataset.state = "armed";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.state = "in";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} id={id} className={className} style={style}>
      {children}
    </div>
  );
}
