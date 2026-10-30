import type { ReactNode } from "react";
import { CREATOR } from "@/lib/site/creator";

function InstagramIcon({ size = 18 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GitHubIcon({ size = 18 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

/** A quiet "Made by" line with the creator's GitHub and Instagram, for running text. */
export function CreatorCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`creator-credit ${className}`.trim()}>
      Made by <strong className="font-medium">{CREATOR.name}</strong>
      <span aria-hidden="true"> · </span>
      <a href={CREATOR.instagram.url} className="link-quiet" {...EXTERNAL}>
        Instagram @{CREATOR.instagram.handle}
      </a>
      <span aria-hidden="true"> · </span>
      <a href={CREATOR.github.url} className="link-quiet" {...EXTERNAL}>
        GitHub
      </a>
    </p>
  );
}

/** The designed block for the site footer: name, a short line, Instagram first. */
export function CreatorBlock() {
  return (
    <section
      aria-label="About the creator"
      className="mx-auto mt-10 flex w-full max-w-5xl flex-col gap-5 border-t border-line-strong pt-8 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="brand-mark text-2xl leading-tight">Built by {CREATOR.name}</p>
        <p className="mt-1 text-sm text-mute">Follow along, or say hi.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={CREATOR.instagram.url}
          {...EXTERNAL}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-copper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux"
        >
          <InstagramIcon />
          @{CREATOR.instagram.handle}
        </a>
        <a
          href={CREATOR.github.url}
          {...EXTERNAL}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-paper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux"
        >
          <GitHubIcon />
          {CREATOR.github.handle}
        </a>
      </div>
    </section>
  );
}

/** Slim credit under the guide workspace; it also closes the printed guide. */
export function CreatorStrip() {
  return (
    <footer className="ga-credit">
      <span>
        Made by <strong>{CREATOR.name}</strong>
      </span>
      <a href={CREATOR.instagram.url} {...EXTERNAL}>
        <InstagramIcon size={14} />
        <span>@{CREATOR.instagram.handle}</span>
      </a>
      <a href={CREATOR.github.url} {...EXTERNAL}>
        <GitHubIcon size={14} />
        <span>{CREATOR.github.handle}</span>
      </a>
    </footer>
  );
}
