"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getCatalogPart } from "@/lib/catalog";
import {
  googleImagesLookupUrl,
  resolvePartPhoto,
} from "@/lib/catalog/part-media";
import type { CatalogPart, GuidePart } from "@/lib/catalog/types";

type PrepPartsProps = {
  parts: GuidePart[];
};

function PartThumb({
  catalog,
  name,
}: {
  catalog?: CatalogPart;
  name: string;
}) {
  const src = resolvePartPhoto(catalog?.photoHint);
  if (src) {
    return (
      <img
        src={src}
        alt={catalog?.photoCaption || name}
        className="h-14 w-14 shrink-0 border border-line object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center border border-line bg-paper-deep font-mono text-[10px] tracking-wide text-mute"
      aria-hidden="true"
    >
      {(catalog?.photoHint || catalog?.kind || "part").slice(0, 4)}
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
  const src = resolvePartPhoto(catalog?.photoHint);
  const lookupQ = `${name} ${catalog?.kind || "electronics"} component`;
  const matching = catalog?.variants?.filter((v) => v.matchesGuide) ?? [];
  const others = catalog?.variants?.filter((v) => !v.matchesGuide) ?? [];

  return (
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        {src ? (
          <img
            src={src}
            alt={catalog?.photoCaption || name}
            className="h-28 w-28 shrink-0 border border-line object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-dashed border-line bg-paper-deep px-2 text-center font-mono text-[10px] text-mute">
            No local photo yet
          </div>
        )}
        <div className="min-w-0 space-y-2">
          <p className="font-semibold tracking-tight text-ink">{name}</p>
          {catalog?.photoCaption ? (
            <p className="text-xs leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">In the photo: </span>
              {catalog.photoCaption}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-ink-soft">
            {catalog?.description || "Catalog part"}
          </p>
          <a
            href={googleImagesLookupUrl(lookupQ)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-xs font-medium text-flux underline-offset-2 hover:underline"
          >
            More reference photos on Google Images
          </a>
        </div>
      </div>

      {catalog?.identify ? (
        <section className="space-y-1">
          <h4 className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            How to recognize it
          </h4>
          <p className="text-xs leading-relaxed text-ink-soft">{catalog.identify}</p>
        </section>
      ) : null}

      {matching.length > 0 || others.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            Variants — pick the right one
          </h4>
          <ul className="space-y-2">
            {matching.map((variant) => (
              <li
                key={variant.label}
                className="border border-flux/40 bg-paper-deep/70 px-3 py-2"
              >
                <p className="text-xs font-semibold text-ink">
                  {variant.label}
                  <span className="ml-2 font-mono text-[10px] tracking-wide text-flux">
                    THIS GUIDE
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {variant.detail}
                </p>
              </li>
            ))}
            {others.map((variant) => (
              <li key={variant.label} className="border border-line px-3 py-2">
                <p className="text-xs font-semibold text-ink">{variant.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {variant.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {catalog?.watchOuts && catalog.watchOuts.length > 0 ? (
        <section className="space-y-1">
          <h4 className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            Watch outs
          </h4>
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-soft">
            {catalog.watchOuts.map((item) => (
              <li key={item}>{item}</li>
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
  const rootRef = useRef<HTMLLIElement>(null);
  const hasVariants = Boolean(catalog?.variants?.length);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li
      ref={rootRef}
      className="relative py-3"
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <button
          type="button"
          className="group flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          onMouseEnter={() => setOpen(true)}
        >
          <PartThumb catalog={catalog} name={name} />
          <div className="min-w-0 pt-0.5">
            <p className="font-medium text-ink group-hover:text-flux">{name}</p>
            <p className="text-sm text-ink-soft">
              {catalog?.description || "Catalog part"}
            </p>
            {hasVariants ? (
              <p className="mt-1 text-[11px] font-medium tracking-wide text-copper">
                Has lookalike variants — hover or open details
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-mute">Hover or click for photo details</p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="border border-line px-2 py-1 font-mono text-[11px] tracking-wide text-ink hover:border-flux hover:text-flux"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "More"}
          </button>
          <span className="font-mono text-xs tracking-wide text-mute">
            {part.instanceId}
          </span>
        </div>
      </div>

      {open ? (
        <div
          id={panelId}
          className="mt-3 border border-line-strong bg-paper px-3 py-3 shadow-sm"
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
