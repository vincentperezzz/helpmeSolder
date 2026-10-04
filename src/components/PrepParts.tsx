import { resolvePhotoPath } from "@/lib/catalog/photos";
import { getCatalogPart } from "@/lib/catalog";
import type { GuidePart } from "@/lib/catalog/types";

type PrepPartsProps = {
  parts: GuidePart[];
};

export function PrepParts({ parts }: PrepPartsProps) {
  if (parts.length === 0) {
    return <p className="text-ink-soft">No parts yet.</p>;
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {parts.map((part) => {
        const catalog = getCatalogPart(part.catalogId);
        const photoHint = catalog?.photoHint;
        const photoSrc = resolvePhotoPath(photoHint);
        return (
          <li
            key={part.instanceId}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={part.label || catalog?.name || part.catalogId}
                  className="h-12 w-12 shrink-0 border border-line object-cover"
                />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-paper-deep font-mono text-[10px] tracking-wide text-mute"
                  aria-hidden="true"
                >
                  {photoHint
                    ? photoHint.slice(0, 4)
                    : catalog?.kind?.slice(0, 3) || "part"}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {part.label || catalog?.name || part.catalogId}
                </p>
                <p className="text-sm text-ink-soft">
                  {catalog?.description || "Catalog part"}
                </p>
                {photoHint ? (
                  <p className="mt-1 font-mono text-[11px] text-mute">
                    photoHint: {photoHint}
                    {photoSrc ? ` → ${photoSrc}` : " (skeleton fallback)"}
                  </p>
                ) : null}
              </div>
            </div>
            <span className="font-mono text-xs tracking-wide text-mute">
              {part.instanceId}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
