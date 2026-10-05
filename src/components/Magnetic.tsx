"use client";

import { useRef, type ReactNode } from "react";

type MagneticProps = {
  children: ReactNode;
};

const PULL = 0.28;
const MAX_SHIFT = 10;

function clamp(value: number): number {
  return Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, value));
}

/** Pulls its child a few pixels toward the mouse while the pointer is near. */
export function Magnetic({ children }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  function handleMove(event: React.PointerEvent<HTMLSpanElement>): void {
    const element = ref.current;
    if (!element || event.pointerType !== "mouse") {
      return;
    }
    const rect = element.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    element.style.transform = `translate(${clamp(dx * PULL)}px, ${clamp(dy * PULL)}px)`;
  }

  function handleLeave(): void {
    if (ref.current) {
      ref.current.style.transform = "";
    }
  }

  return (
    <span
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="magnetic"
    >
      {children}
    </span>
  );
}
