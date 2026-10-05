import { getCatalogPart } from "@/lib/catalog";

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
  return (
    <div
      data-instance={instanceId}
      className="rounded-md border border-line bg-paper-deep px-3 py-2"
      style={{ minWidth: 140 }}
    >
      <p className="text-xs font-semibold text-ink">{name}</p>
      <p className="font-mono text-[10px] text-mute">skeleton fallback</p>
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
