import { getBoardAsset, type BoardAsset } from "@/lib/catalog/board-assets";

function AssetVisual({ asset, alt }: { asset: BoardAsset; alt: string }) {
  return (
    <div style={{ width: asset.width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        width={asset.width}
        height={asset.height}
        alt={alt}
        draggable={false}
      />
      <p className="mt-1 font-mono text-[9px] text-mute">{asset.caption}</p>
    </div>
  );
}

/** Diagram / parts tile for a catalog board when Wokwi has no visual. */
export function BoardAssetVisual({ catalogId }: { catalogId: string }) {
  const asset = getBoardAsset(catalogId);
  if (!asset) return null;
  return <AssetVisual asset={asset} alt={asset.caption} />;
}
