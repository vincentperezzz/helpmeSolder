"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-copper hover:text-copper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux print:hidden"
    >
      Print this guide
    </button>
  );
}
