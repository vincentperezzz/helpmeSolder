"use client";

import type { ReactNode } from "react";

type ScrollLinkProps = {
  targetId: string;
  className?: string;
  current?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

const NAV_OFFSET = 72;

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function scrollToElement(target: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = window.scrollY;
  const distance = target.getBoundingClientRect().top - NAV_OFFSET;
  if (reduced || Math.abs(distance) < 4) {
    window.scrollBy(0, distance);
    return;
  }

  const duration = Math.min(1500, Math.max(800, Math.abs(distance) * 0.6));
  const startedAt = performance.now();
  let frame = 0;

  function stop(): void {
    cancelAnimationFrame(frame);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  }

  function step(now: number): void {
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, start + distance * easeInOutQuart(progress));
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      stop();
    }
  }

  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);
  frame = requestAnimationFrame(step);
}

export function ScrollLink({
  targetId,
  className,
  current,
  onClick,
  children,
}: ScrollLinkProps) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>): void {
    onClick?.();
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    event.preventDefault();
    scrollToElement(target);
    history.replaceState(null, "", `#${targetId}`);
  }

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={className}
      aria-current={current ? "true" : undefined}
    >
      {children}
    </a>
  );
}
