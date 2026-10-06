"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { getCatalogPart } from "@/lib/catalog";
import type { PartPhoto } from "@/lib/catalog/photo-shared";
import type { GuidePart } from "@/lib/catalog/types";
import {
  PartCard,
  PartDetail,
  PartImage,
  buildPartView,
  partPhotosUrl,
  type PartView,
} from "@/components/parts/PartCardView";

type PrepPartsProps = {
  parts: GuidePart[];
};

const photoCache = new Map<string, PartPhoto[]>();

/** Loads outside photos once per part per page load. Failure reads as "none". */
function useOutsidePhotos(catalogId?: string): PartPhoto[] | undefined {
  const [loaded, setLoaded] = useState<{ id: string; images: PartPhoto[] } | null>(
    null,
  );

  const url = catalogId ? partPhotosUrl(catalogId) : undefined;

  useEffect(() => {
    if (!catalogId || !url || photoCache.has(url)) return;
    const controller = new AbortController();
    fetch(url, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return [];
        const data: unknown = await res.json();
        const list = (data as { images?: unknown }).images;
        const images = Array.isArray(list) ? (list as PartPhoto[]).slice(0, 3) : [];
        photoCache.set(url, images);
        return images;
      })
      .catch(() => (controller.signal.aborted ? null : []))
      .then((images) => {
        if (images) setLoaded({ id: catalogId, images });
      });
    return () => controller.abort();
  }, [catalogId, url]);

  if (!catalogId) return [];
  return photoCache.get(url!) ?? (loaded?.id === catalogId ? loaded.images : undefined);
}

/** Keyed by instance so each opened part starts its photo lookup fresh. */
function LivePartDetail({
  view,
  onBack,
  backRef,
}: {
  view: PartView;
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
}) {
  const images = useOutsidePhotos(view.catalog?.id);
  return <PartDetail view={view} images={images} onBack={onBack} backRef={backRef} />;
}


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

  const views: PartView[] = parts.map((part) =>
    buildPartView(part, getCatalogPart(part.catalogId)),
  );
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
          <LivePartDetail key={open.part.instanceId} view={open} onBack={closePart} backRef={backRef} />
        ) : (
          <div>
            <p className="mb-3 text-[13px] text-mute">Tap a part for its photos and notes.</p>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-6 min-[360px]:grid-cols-2">
              {views.map((v) => (
                <li key={v.part.instanceId}>
                  <PartCard
                    view={v}
                    onSelect={() => openPart(v.part.instanceId)}
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
