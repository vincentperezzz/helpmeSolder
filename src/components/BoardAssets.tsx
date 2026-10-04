import type { BoardAsset } from "@/lib/catalog/board-assets";

export function BoardAssetVisual({
  instanceId,
  name,
  asset,
}: {
  instanceId: string;
  name: string;
  asset: BoardAsset;
}) {
  return (
    <div
      data-instance={instanceId}
      className="relative select-none"
      style={{ width: asset.width, height: asset.height }}
    >
      <p className="pointer-events-none absolute -top-4 left-0 text-[10px] font-semibold tracking-wide text-ink-soft">
        {name}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt={asset.caption}
        width={asset.width}
        height={asset.height}
        className="block"
        draggable={false}
      />
    </div>
  );
}
