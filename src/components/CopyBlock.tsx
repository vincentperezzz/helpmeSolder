"use client";

import { useState } from "react";

const HOLES = [
  "left-2 top-2",
  "right-2 top-2",
  "bottom-2 left-2",
  "bottom-2 right-2",
];

type CopyBlockProps = {
  label: string;
  code: string;
};

export function CopyBlock({ label, code }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
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
        <span className="font-mono text-xs tracking-wide text-paper/60">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-sm border border-paper/25 px-2.5 py-1 font-mono text-xs text-paper/85 transition-colors hover:border-copper hover:text-paper focus-visible:outline-2 focus-visible:outline-paper"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all px-8 pb-8 pt-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
