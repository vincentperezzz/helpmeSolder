"use client";

import { useEffect, useRef, type ReactNode } from "react";

type HeroMotionProps = {
  className?: string;
  children: ReactNode;
};

const EASE = 0.08;

function pointerMotionAllowed(): boolean {
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Publishes the eased cursor position as CSS variables on the hero:
 * --px / --py in -1..1 for parallax, --mx / --my in px for the glow.
 */
export function HeroMotion({ className, children }: HeroMotionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !pointerMotionAllowed()) {
      return;
    }
    const hero = element;

    const target = { x: 0.5, y: 0.5 };
    const current = { x: 0.5, y: 0.5 };
    let frame = 0;
    let running = false;

    function tick(): void {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      hero.style.setProperty("--px", ((current.x - 0.5) * 2).toFixed(3));
      hero.style.setProperty("--py", ((current.y - 0.5) * 2).toFixed(3));
      hero.style.setProperty("--mx", `${(current.x * hero.clientWidth).toFixed(1)}px`);
      hero.style.setProperty("--my", `${(current.y * hero.clientHeight).toFixed(1)}px`);

      const settled =
        Math.abs(target.x - current.x) < 0.0005 &&
        Math.abs(target.y - current.y) < 0.0005;
      if (settled) {
        running = false;
      } else {
        frame = requestAnimationFrame(tick);
      }
    }

    function start(): void {
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    }

    function onMove(event: PointerEvent): void {
      if (event.pointerType !== "mouse") {
        return;
      }
      const rect = hero.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = (event.clientY - rect.top) / rect.height;
      hero.dataset.active = "true";
      start();
    }

    function onLeave(): void {
      target.x = 0.5;
      target.y = 0.5;
      hero.dataset.active = "false";
      start();
    }

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section ref={ref} className={className}>
      <div aria-hidden="true" className="hero-glow" />
      {children}
    </section>
  );
}
