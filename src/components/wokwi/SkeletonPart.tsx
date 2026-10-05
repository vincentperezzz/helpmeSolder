import { getCatalogPart } from "@/lib/catalog";
import { partCategory, type PartCategory } from "@/lib/catalog/part-media";

/** Simple generic drawing for a part type. Never prints ids. */
export function PartGlyph({
  category,
  className,
}: {
  category: PartCategory;
  className?: string;
}) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let body;
  switch (category) {
    case "Board":
      body = (
        <>
          <rect x="10" y="14" width="28" height="20" rx="2" {...stroke} />
          <rect x="19" y="20" width="10" height="8" {...stroke} />
          <path
            d="M14 10v4M20 10v4M26 10v4M32 10v4M14 34v4M20 34v4M26 34v4M32 34v4"
            {...stroke}
          />
        </>
      );
      break;
    case "Sensor":
      body = (
        <>
          <circle cx="24" cy="24" r="4" {...stroke} />
          <path
            d="M16 16a11 11 0 0 0 0 16M32 16a11 11 0 0 1 0 16M11 11a18 18 0 0 0 0 26M37 11a18 18 0 0 1 0 26"
            {...stroke}
          />
        </>
      );
      break;
    case "Display":
      body = (
        <>
          <rect x="8" y="12" width="32" height="22" rx="2" {...stroke} />
          <path d="M14 20h14M14 26h20M18 38h12" {...stroke} />
        </>
      );
      break;
    case "Output":
      body = (
        <>
          <path d="M18 36h12M20 40h8" {...stroke} />
          <path
            d="M16 30a10 10 0 1 1 16 0c-2 2-2 4-2 6H18c0-2 0-4-2-6Z"
            {...stroke}
          />
          <path d="M24 4v3M9 12l2 2M39 12l-2 2" {...stroke} />
        </>
      );
      break;
    case "Input":
      body = (
        <>
          <rect x="9" y="22" width="30" height="14" rx="3" {...stroke} />
          <path d="M16 22v-6h16v6" {...stroke} />
          <circle cx="24" cy="29" r="2" {...stroke} />
        </>
      );
      break;
    case "Power":
      body = (
        <>
          <rect x="10" y="16" width="24" height="16" rx="2" {...stroke} />
          <path d="M34 22h4v4h-4M17 24h6M20 21v6" {...stroke} />
        </>
      );
      break;
    default:
      body = (
        <>
          <path d="M4 24h10M34 24h10" {...stroke} />
          <rect x="14" y="18" width="20" height="12" rx="2" {...stroke} />
        </>
      );
  }
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
}

export function SkeletonPart({
  instanceId,
  name,
  catalogId,
}: {
  instanceId: string;
  name: string;
  catalogId: string;
}) {
  const catalog = getCatalogPart(catalogId);
  const category = partCategory(catalog);
  return (
    <div
      data-instance={instanceId}
      className="rounded-md border border-line bg-paper-deep px-3 py-2"
      style={{ minWidth: 140 }}
    >
      <div className="flex items-center gap-2 text-mute">
        <PartGlyph category={category} className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink">{name}</p>
          <p className="text-[10px] text-mute">{category}</p>
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {catalog?.pins.slice(0, 8).map((pin) => (
          <li key={pin.id} className="font-mono text-[10px] text-ink-soft">
            {pin.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
