"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getCatalogPart } from "@/lib/catalog";
import {
  googleImagesLookupUrl,
  partCategory,
  resolvePartPhoto,
} from "@/lib/catalog/part-media";
import type { CatalogPart, GuidePart } from "@/lib/catalog/types";
import { PartGlyph } from "@/components/wokwi/SkeletonPart";

type PrepPartsProps = {
  parts: GuidePart[];
};

function PartThumb({
  catalog,
  name,
  size,
}: {
  catalog?: CatalogPart;
  name: string;
  size: "sm" | "lg";
}) {
  const src = resolvePartPhoto(catalog?.photoHint);
  const [failed, setFailed] = useState(false);
  const box = size === "sm" ? "h-[88px] w-[88px]" : "h-40 w-40 sm:h-48 sm:w-48";
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={catalog?.photoCaption || name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${box} shrink-0 border border-line bg-paper-deep object-contain p-1`}
      />
    );
  }
  const category = partCategory(catalog);
  return (
    <div
      className={`${box} flex shrink-0 flex-col items-center justify-center gap-1 border border-line bg-paper-deep text-mute`}
      aria-hidden="true"
    >
      <PartGlyph category={category} className="h-1/2 w-1/2" />
      <span className="text-[11px]">{category}</span>
    </div>
  );
}

function PartDetails({
  catalog,
  name,
}: {
  catalog?: CatalogPart;
  name: string;
}) {
  const lookupName = catalog?.name || name;
  const lookupQ = `${lookupName} ${partCategory(catalog) === "Board" ? "board" : "module"}`;
  const matching = catalog?.variants?.filter((v) => v.matchesGuide) ?? [];
  const others = catalog?.variants?.filter((v) => !v.matchesGuide) ?? [];
  const hasVariants = matching.length > 0 || others.length > 0;

  return (
    <div className="space-y-4 text-sm">
      <a
        href={googleImagesLookupUrl(lookupQ)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`See more photos of ${lookupName} on Google Images (opens in a new tab)`}
        className="flex min-h-12 w-full items-center justify-center gap-2 border border-line-strong px-4 text-sm font-medium text-ink hover:border-flux hover:text-flux focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux sm:inline-flex sm:w-auto"
      >
        See more photos on Google
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M9 2h5v5M14 2L7.5 8.5M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>

      <div className="flex flex-col gap-3 sm:flex-row">
        <PartThumb catalog={catalog} name={name} size="lg" />
        <div className="min-w-0 space-y-2">
          {catalog?.photoCaption ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">In the photo: </span>
              {catalog.photoCaption}
            </p>
          ) : null}
          {catalog?.identify ? (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-ink">How to spot it</h4>
              <p className="text-sm leading-relaxed text-ink-soft">
                {catalog.identify}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {catalog?.watchOuts && catalog.watchOuts.length > 0 ? (
        <section className="space-y-1">
          <h4 className="text-sm font-semibold text-ink">Watch outs</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-soft">
            {catalog.watchOuts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasVariants ? (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-ink">Versions</h4>
          <p className="text-sm text-ink-soft">
            Parts come in a few versions. Check yours against these.
          </p>
          <ul className="space-y-2">
            {matching.map((variant) => (
              <li
                key={variant.label}
                className="border border-flux/40 bg-paper-deep/70 px-3 py-2"
              >
                <p className="text-sm font-semibold text-ink">
                  {variant.label}
                  <span className="ml-2 text-xs font-medium text-flux">
                    Used in this guide
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {variant.detail}
                </p>
              </li>
            ))}
            {others.map((variant) => (
              <li key={variant.label} className="border border-line px-3 py-2">
                <p className="text-sm font-semibold text-ink">{variant.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {variant.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PrepPartRow({ part }: { part: GuidePart }) {
  const catalog = getCatalogPart(part.catalogId);
  const name = part.label || catalog?.name || part.catalogId;
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLLIElement>(null);
  const hasVariants = Boolean(catalog?.variants?.length);
  const category = partCategory(catalog);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (rootRef.current?.contains(document.activeElement)) {
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <li ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="flex min-h-[72px] w-full cursor-pointer items-start gap-4 px-1 py-4 text-left hover:bg-paper-deep focus-visible:bg-paper-deep focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-flux"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${open ? "Hide" : "Show"} photo and notes for ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <PartThumb catalog={catalog} name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-line px-2 py-0.5 text-xs text-ink-soft">
              {category}
            </span>
            {hasVariants ? (
              <span className="border border-line px-2 py-0.5 text-xs text-mute">
                Has versions
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-lg font-semibold tracking-tight text-ink">
            {name}
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">
            {catalog?.description || "Part"}
          </p>
        </div>
        <span
          data-print-hide
          className="flex shrink-0 items-center gap-2 self-center text-sm text-mute"
          aria-hidden="true"
        >
          <span className="hidden sm:inline">Photo and notes</span>
          <svg
            viewBox="0 0 12 12"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            focusable="false"
          >
            <path
              d="M2 4l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          data-print-hide
          role="region"
          aria-label={`Photo and notes for ${name}`}
          className="mb-4 border border-line-strong bg-paper px-3 py-3"
        >
          <PartDetails catalog={catalog} name={name} />
        </div>
      ) : null}
    </li>
  );
}

export function PrepParts({ parts }: PrepPartsProps) {
  if (parts.length === 0) {
    return <p className="text-ink-soft">No parts yet.</p>;
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {parts.map((part) => (
        <PrepPartRow key={part.instanceId} part={part} />
      ))}
    </ul>
  );
}
