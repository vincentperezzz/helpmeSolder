"use client";

import { useEffect, useRef, useState } from "react";

const HOLES = [
  "left-2 top-2",
  "right-2 top-2",
  "bottom-2 left-2",
  "bottom-2 right-2",
];

function CheckIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="copy-btn__check">
      <path d="M3 8.5l3.2 3.2L13 4.5" />
    </svg>
  );
}

type CopyBlockProps = {
  label: string;
  code: string;
  /** Show a large, full-width copy button for first-time users. */
  prominent?: boolean;
};

export function CopyBlock({ label, code, prominent = false }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="board-panel">
      {HOLES.map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={`board-panel__hole ${position}`}
        />
      ))}
      <div className="flex items-center justify-between px-8 pt-4">
        <span
          className={
            prominent
              ? "font-mono text-sm font-medium tracking-wide text-paper/85"
              : "font-mono text-xs tracking-wide text-paper/60"
          }
        >
          {label}
        </span>
        {!prominent && (
          <button
            type="button"
            onClick={copy}
            data-copied={copied}
            aria-live="polite"
            className="copy-btn press"
          >
            {copied ? <CheckIcon /> : null}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre className="whitespace-pre-wrap break-all px-8 pb-4 pt-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
      {prominent ? (
        <div className="px-8 pb-8">
          <button
            type="button"
            onClick={copy}
            data-copied={copied}
            aria-live="polite"
            className="copy-btn copy-btn--wide press"
          >
            {copied ? <CheckIcon /> : null}
            {copied ? "Copied. Now paste it." : "Copy this address"}
          </button>
        </div>
      ) : (
        <div className="pb-4" />
      )}
    </div>
  );
}
