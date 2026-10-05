"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { getCatalogPart } from "@/lib/catalog";
import type { CommonsImage } from "@/lib/catalog/commons";
import {
  googleImagesLookupUrl,
  partCategory,
  resolvePartPhoto,
  type PartCategory,
} from "@/lib/catalog/part-media";
import type { CatalogPart, GuidePart, PartVariantNote } from "@/lib/catalog/types";
import { PartGlyph } from "@/components/wokwi/SkeletonPart";

type PrepPartsProps = {
  parts: GuidePart[];
};

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flux";

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                */
/* -------------------------------------------------------------------------- */

function Chip({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "accent";
}) {
  return (
    <span
      className={
        tone === "accent"
          ? "inline-flex items-center border border-flux/40 bg-flux/5 px-2 py-0.5 text-xs font-medium text-flux"
          : "inline-flex items-center border border-line px-2 py-0.5 text-xs text-ink-soft"
      }
    >
      {children}
    </span>
  );
}

function Arrow({ direction }: { direction: "left" | "right" | "out" }) {
  const d =
    direction === "left"
      ? "M10 3L5 8l5 5"
      : direction === "right"
        ? "M6 3l5 5-5 5"
        : "M9 2h5v5M14 2L7.5 8.5M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5";
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Local photo or illustration on a paper tile, with a glyph when there is none. */
function PartImage({
  catalog,
  name,
  variant,
}: {
  catalog?: CatalogPart;
  name: string;
  variant: "thumb" | "hero" | "tile";
}) {
  const src = resolvePartPhoto(catalog?.photoHint);
  const [failed, setFailed] = useState(false);
  const category = partCategory(catalog);
  const hero = variant === "hero";
  const tile = variant === "tile";

  if (src && !failed) {
    return (
      <span
        className={
          hero || tile
            ? "flex aspect-[4/3] w-full items-center justify-center border border-line bg-paper-deep"
            : "flex h-[72px] w-[72px] shrink-0 items-center justify-center border border-line bg-paper-deep"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={hero ? catalog?.photoCaption || name : ""}
          loading={hero ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className={`h-full w-full object-contain mix-blend-multiply ${hero ? "p-5" : tile ? "p-3" : "p-1.5"}`}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={
        tile
          ? "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 border border-line bg-paper-deep text-mute"
          : hero
          ? "flex aspect-[16/7] w-full flex-col items-center justify-center gap-1 border border-line bg-paper-deep text-mute"
          : "flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 border border-line bg-paper-deep text-mute"
      }
    >
      <PartGlyph category={category} className={hero || tile ? "h-12 w-12" : "h-7 w-7"} />
      <span className="text-[11px] leading-none">{category}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Level 1: the list                                                           */
/* -------------------------------------------------------------------------- */

type PartView = {
  part: GuidePart;
  catalog?: CatalogPart;
  name: string;
  category: PartCategory;
  hasVersions: boolean;
};

function PartCard({
  view,
  onOpen,
  setRef,
}: {
  view: PartView;
  onOpen: () => void;
  setRef: (el: HTMLButtonElement | null) => void;
}) {
  const { catalog, name, category, hasVersions } = view;
  return (
    <button
      ref={setRef}
      type="button"
      onClick={onOpen}
      aria-label={`Show details for ${name}`}
      className={`group flex h-full w-full cursor-pointer flex-col gap-2.5 text-left ${FOCUS}`}
    >
      <span className="relative block w-full transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <PartImage catalog={catalog} name={name} variant="tile" />
        {hasVersions ? (
          <span className="absolute top-1.5 right-1.5 border border-flux/40 bg-paper px-1.5 py-0.5 text-[11px] font-medium leading-none text-flux">
            Has versions
          </span>
        ) : null}
      </span>
      <span className="block min-w-0">
        <span className="line-clamp-2 block text-[14px] font-semibold leading-snug tracking-tight text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">
          {name}
        </span>
        <span className="mt-1.5 block">
          <Chip>{category}</Chip>
        </span>
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Level 2: the detail view                                                    */
/* -------------------------------------------------------------------------- */

const photoCache = new Map<string, CommonsImage[]>();

/** Loads Commons photos once per part per page load. Failure reads as "none". */
function useCommonsPhotos(catalogId?: string): CommonsImage[] | undefined {
  const [loaded, setLoaded] = useState<{ id: string; images: CommonsImage[] } | null>(
    null,
  );

  useEffect(() => {
    if (!catalogId || photoCache.has(catalogId)) return;
    const controller = new AbortController();
    fetch(`/api/part-photos?id=${encodeURIComponent(catalogId)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return [];
        const data: unknown = await res.json();
        const list = (data as { images?: unknown }).images;
        const images = Array.isArray(list) ? (list as CommonsImage[]).slice(0, 3) : [];
        photoCache.set(catalogId, images);
        return images;
      })
      .catch(() => (controller.signal.aborted ? null : []))
      .then((images) => {
        if (images) setLoaded({ id: catalogId, images });
      });
    return () => controller.abort();
  }, [catalogId]);

  if (!catalogId) return [];
  return photoCache.get(catalogId) ?? (loaded?.id === catalogId ? loaded.images : undefined);
}

function PhotoRowSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="aspect-[4/3] w-28 shrink-0 bg-paper-deep motion-safe:animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 bg-paper-deep motion-safe:animate-pulse" />
        <div className="h-3 w-1/2 bg-paper-deep motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

function CommonsPhoto({ image }: { image: CommonsImage }) {
  return (
    <a
      href={image.pageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 p-1 -m-1 hover:bg-paper-deep/50 ${FOCUS}`}
    >
      <span className="flex aspect-[4/3] w-28 shrink-0 items-center justify-center overflow-hidden border border-line bg-paper-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.thumb}
          alt={image.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="line-clamp-2 block text-ink">{image.title}</span>
        <span className="mt-1 block text-mute underline decoration-line-strong underline-offset-2 group-hover:text-ink">
          Photo: {image.author}, {image.license}
          <span className="sr-only"> (opens Wikimedia Commons in a new tab)</span>
        </span>
      </span>
    </a>
  );
}

function RealPhotos({ catalogId }: { catalogId?: string }) {
  const images = useCommonsPhotos(catalogId);
  return (
    <section aria-labelledby="more-photos-h" className="border-t border-line pt-5">
      <h4 id="more-photos-h" className="text-sm font-semibold text-ink">
        More real photos
      </h4>
      <p className="mt-0.5 text-[13px] text-mute">Open-licensed, from Wikimedia Commons.</p>
      <div className="mt-3 space-y-3" aria-busy={images === undefined}>
        {images === undefined ? (
          <>
            <span className="sr-only" role="status">
              Looking for photos
            </span>
            <PhotoRowSkeleton />
            <PhotoRowSkeleton />
          </>
        ) : images.length === 0 ? (
          <p className="text-sm text-ink-soft">No more photos found.</p>
        ) : (
          images.map((image) => <CommonsPhoto key={image.pageUrl} image={image} />)
        )}
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** Native disclosure for lists that would otherwise run long. */
function More({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group mt-2 border border-line">
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-ink-soft hover:bg-paper-deep/50 [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        {summary}
        <svg
          viewBox="0 0 12 12"
          className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2 4l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="space-y-2 border-t border-line p-2">{children}</div>
    </details>
  );
}

function VersionItem({ variant }: { variant: PartVariantNote }) {
  return (
    <li
      className={
        variant.matchesGuide
          ? "border border-flux/40 border-l-[3px] border-l-flux bg-flux/5 px-3 py-2.5"
          : "border border-line px-3 py-2.5"
      }
    >
      <p className="text-sm font-semibold text-ink">
        {variant.label}
        {variant.matchesGuide ? (
          <span className="ml-2 text-xs font-medium text-flux">Used in this guide</span>
        ) : null}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{variant.detail}</p>
    </li>
  );
}

const WATCH_OUTS_SHOWN = 3;
const OTHER_VERSIONS_SHOWN = 1;

function PartDetail({
  view,
  onBack,
  backRef,
}: {
  view: PartView;
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
}) {
  const { part, catalog, name, category } = view;
  const lookupName = catalog?.name || name;
  const lookupQ = `${lookupName} ${category === "Board" ? "board" : "module"}`;
  const matching = catalog?.variants?.filter((v) => v.matchesGuide) ?? [];
  const others = catalog?.variants?.filter((v) => !v.matchesGuide) ?? [];
  const watchOuts = catalog?.watchOuts ?? [];

  return (
    <div role="region" aria-label={`Details for ${name}`}>
      <div className="sticky top-0 z-10 border-b border-line bg-paper py-1.5">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          className={`-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-2 text-sm font-medium text-flux hover:text-ink ${FOCUS}`}
        >
          <Arrow direction="left" />
          Back to parts
        </button>
      </div>

      <article className="space-y-5 pt-5 pb-1">
        <header>
          <div className="flex flex-wrap gap-1.5">
            <Chip>{category}</Chip>
            {(catalog?.variants?.length ?? 0) > 0 ? (
              <Chip tone="accent">Has versions</Chip>
            ) : null}
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-ink">
            {name}
          </h3>
          {catalog?.description ? (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              {catalog.description}
            </p>
          ) : null}
        </header>

        <figure>
          <PartImage catalog={catalog} name={name} variant="hero" />
          {catalog?.photoCaption ? (
            <figcaption className="mt-2 text-[13px] leading-snug text-mute">
              {catalog.photoCaption}
            </figcaption>
          ) : null}
        </figure>

        {catalog?.identify ? (
          <Section title="How to spot it">
            <p className="text-sm leading-relaxed text-ink-soft">{catalog.identify}</p>
          </Section>
        ) : null}

        {watchOuts.length > 0 ? (
          <Section title="Watch outs">
            <ul className="space-y-2">
              {watchOuts.slice(0, WATCH_OUTS_SHOWN).map((item) => (
                <WatchOut key={item}>{item}</WatchOut>
              ))}
            </ul>
            {watchOuts.length > WATCH_OUTS_SHOWN ? (
              <More summary={`${watchOuts.length - WATCH_OUTS_SHOWN} more`}>
                <ul className="space-y-2 p-1">
                  {watchOuts.slice(WATCH_OUTS_SHOWN).map((item) => (
                    <WatchOut key={item}>{item}</WatchOut>
                  ))}
                </ul>
              </More>
            ) : null}
          </Section>
        ) : null}

        {matching.length + others.length > 0 ? (
          <Section title="Versions">
            <p className="mb-2 text-[13px] text-mute">
              This part comes in a few versions. Check yours against these.
            </p>
            <ul className="space-y-2">
              {matching.map((v) => (
                <VersionItem key={v.label} variant={v} />
              ))}
              {others.slice(0, matching.length > 0 ? OTHER_VERSIONS_SHOWN : 2).map((v) => (
                <VersionItem key={v.label} variant={v} />
              ))}
            </ul>
            {others.length > (matching.length > 0 ? OTHER_VERSIONS_SHOWN : 2) ? (
              <More
                summary={`${others.length - (matching.length > 0 ? OTHER_VERSIONS_SHOWN : 2)} other versions`}
              >
                <ul className="space-y-2">
                  {others.slice(matching.length > 0 ? OTHER_VERSIONS_SHOWN : 2).map((v) => (
                    <VersionItem key={v.label} variant={v} />
                  ))}
                </ul>
              </More>
            ) : null}
          </Section>
        ) : null}

        <RealPhotos key={part.instanceId} catalogId={catalog?.id} />

        <p className="border-t border-line pt-1">
          <a
            href={googleImagesLookupUrl(lookupQ)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Search Google Images for ${lookupName} (opens in a new tab)`}
            className={`inline-flex min-h-11 items-center gap-1.5 text-[13px] text-mute underline decoration-line-strong underline-offset-4 hover:text-ink ${FOCUS}`}
          >
            Search Google Images
            <Arrow direction="out" />
          </a>
        </p>
      </article>
    </div>
  );
}

function WatchOut({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-4 text-sm leading-relaxed text-ink-soft before:absolute before:top-[0.7em] before:left-0 before:h-0.5 before:w-2 before:bg-copper">
      {children}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* The two-level container                                                     */
/* -------------------------------------------------------------------------- */

function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
}

type Restore = { id: string; top: number; parent: HTMLElement | null };

export function PrepParts({ parts }: PrepPartsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const restore = useRef<Restore | null>(null);

  const views: PartView[] = parts.map((part) => {
    const catalog = getCatalogPart(part.catalogId);
    return {
      part,
      catalog,
      name: part.label || catalog?.name || part.catalogId,
      category: partCategory(catalog),
      hasVersions: Boolean(catalog?.variants?.length),
    };
  });
  const open = openId ? views.find((v) => v.part.instanceId === openId) : undefined;

  const openPart = useCallback((id: string) => {
    const parent = scrollParentOf(rootRef.current);
    restore.current = {
      id,
      parent,
      top: parent ? parent.scrollTop : window.scrollY,
    };
    setOpenId(id);
  }, []);

  const closePart = useCallback(() => setOpenId(null), []);

  // Move focus and scroll when switching between the two levels.
  useLayoutEffect(() => {
    const saved = restore.current;
    if (open) {
      backRef.current?.focus({ preventScroll: true });
      const root = rootRef.current;
      if (root) {
        const boundary = saved?.parent?.getBoundingClientRect().top ?? 0;
        if (root.getBoundingClientRect().top < boundary) {
          root.scrollIntoView({ block: "start" });
        }
      }
    } else if (saved) {
      if (saved.parent) saved.parent.scrollTop = saved.top;
      else window.scrollTo({ top: saved.top });
      cards.current.get(saved.id)?.focus({ preventScroll: true });
      restore.current = null;
    }
  }, [open]);

  // Escape also works when focus has drifted outside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        setOpenId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (parts.length === 0) {
    return <p className="text-ink-soft">No parts yet.</p>;
  }

  return (
    <div ref={rootRef}>
      {/* Paper: one plain list, no controls. */}
      <ul className="hidden print:block">
        {views.map((v) => (
          <li
            key={v.part.instanceId}
            className="flex items-start gap-3 border-b border-line py-2 break-inside-avoid"
          >
            <PartImage catalog={v.catalog} name={v.name} variant="thumb" />
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {v.name} <span className="text-sm font-normal text-ink-soft">({v.category})</span>
              </p>
              <p className="text-sm text-ink-soft">{v.catalog?.description || "Part"}</p>
            </div>
          </li>
        ))}
      </ul>

      <div
        data-print-hide
        // Stops an outer Escape handler (a closing drawer, say) from also firing.
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            closePart();
          }
        }}
      >
        {open ? (
          <PartDetail view={open} onBack={closePart} backRef={backRef} />
        ) : (
          <div>
            <p className="mb-3 text-[13px] text-mute">Tap a part for its photos and notes.</p>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-6 min-[360px]:grid-cols-2">
              {views.map((v) => (
                <li key={v.part.instanceId}>
                  <PartCard
                    view={v}
                    onOpen={() => openPart(v.part.instanceId)}
                    setRef={(el) => {
                      if (el) cards.current.set(v.part.instanceId, el);
                      else cards.current.delete(v.part.instanceId);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
