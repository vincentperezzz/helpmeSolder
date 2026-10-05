import { BatteryAssetVisual, UsbWallVisual } from "@/components/BatteryAssets";
import { getBatteryAsset, type BatteryKind } from "@/lib/catalog/batteries";
import type { PowerSource } from "@/lib/catalog/types";
import type { BatteryPowerSource } from "@/lib/guides/power-source";
import { POWER_ORIGIN } from "./constants";
import type { ExitDir, Point } from "./types";

export const BATTERY_WIRE_ANCHORS: Record<
  BatteryPowerSource,
  { plus: Point; minus: Point; plusExit: ExitDir; minusExit: ExitDir }
> = (["battery_9v", "battery_2aa", "battery_3aa", "battery_18650"] as BatteryKind[]).reduce(
  (acc, kind) => {
    const asset = getBatteryAsset(kind);
    acc[kind] = {
      plus: {
        x: POWER_ORIGIN.x + asset.terminals.plus.x,
        y: POWER_ORIGIN.y + asset.terminals.plus.y,
      },
      minus: {
        x: POWER_ORIGIN.x + asset.terminals.minus.x,
        y: POWER_ORIGIN.y + asset.terminals.minus.y,
      },
      plusExit: asset.terminals.plusExit,
      minusExit: asset.terminals.minusExit,
    };
    return acc;
  },
  {} as Record<
    BatteryPowerSource,
    { plus: Point; minus: Point; plusExit: ExitDir; minusExit: ExitDir }
  >,
);

export function PowerSourceVisual({
  source,
  x,
  y,
}: {
  source: PowerSource;
  x: number;
  y: number;
}) {
  if (source === "usb_wall") {
    return (
      <div
        data-instance="power-source"
        className="absolute"
        style={{ left: x, top: y, width: 150 }}
      >
        <UsbWallVisual />
      </div>
    );
  }

  const asset = getBatteryAsset(source);
  return (
    <div
      data-instance="power-source"
      className="absolute"
      style={{ left: x, top: y, width: asset.width }}
    >
      <BatteryAssetVisual kind={source} />
    </div>
  );
}
