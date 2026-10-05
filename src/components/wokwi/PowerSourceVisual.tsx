import type { HTMLAttributes } from "react";
import {
  BATTERY_CAPTION_LINE,
  BatteryAssetVisual,
  captionLineCount,
  USB_WALL_SIZE,
  USB_WALL_SOCKET,
  UsbWallVisual,
} from "@/components/BatteryAssets";
import { BATTERY_RECORD_LIST } from "@/lib/catalog/battery-records";
import { getBatteryAsset, type BatteryAsset, type BatteryKind } from "@/lib/catalog/batteries";
import type { PowerSource } from "@/lib/catalog/types";
import { isBatteryPowerSource, type BatteryPowerSource } from "@/lib/guides/power-source";
import { POWER_ORIGIN } from "./constants";
import type { ExitDir, Point } from "./types";

export const BATTERY_WIRE_ANCHORS: Record<
  BatteryPowerSource,
  { plus: Point; minus: Point; plusExit: ExitDir; minusExit: ExitDir }
> = (BATTERY_RECORD_LIST.map((record) => record.id) as BatteryKind[]).reduce(
  (acc, kind) => {
    const asset = getBatteryAsset(kind);
    // Packs with their minus tab below the cells have the caption underneath. The
    // wire leaves sideways so it never runs through the caption text.
    const minusExit =
      asset.terminals.minusExit.dy > 0 ? { dx: 1, dy: 0 } : asset.terminals.minusExit;
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
      minusExit,
    };
    return acc;
  },
  {} as Record<
    BatteryPowerSource,
    { plus: Point; minus: Point; plusExit: ExitDir; minusExit: ExitDir }
  >,
);

/** Where the cable leaves the adapter's USB socket, in diagram coordinates. */
export const USB_WALL_OUT: Point = {
  x: POWER_ORIGIN.x + USB_WALL_SOCKET.x,
  y: POWER_ORIGIN.y + USB_WALL_SOCKET.y,
};

/** Footprint of the adapter drawing, a little short of its socket so the plug sits outside it. */
export const USB_WALL_BOX = { w: USB_WALL_SOCKET.x + 4, h: USB_WALL_SIZE.height } as const;

/** Wire label prefix: "9V battery", "2xAA cells", ... */
export function powerSourceName(source: BatteryPowerSource): string {
  return getBatteryAsset(source).label;
}

/** Height of a battery drawing plus its (wrapping) caption, in diagram px. */
export function batteryBlockHeight(asset: BatteryAsset): number {
  return asset.height + 4 + captionLineCount(asset.caption, asset.width) * BATTERY_CAPTION_LINE;
}

export function PowerSourceVisual({
  source,
  x,
  y,
  hover,
}: {
  source: PowerSource;
  x: number;
  y: number;
  /** Extra attributes for the wrapper (tooltip and focus handlers). */
  hover?: HTMLAttributes<HTMLDivElement>;
}) {
  if (!isBatteryPowerSource(source)) {
    return (
      <div
        data-instance="power-source"
        {...hover}
        className={`absolute ${hover?.className ?? ""}`}
        style={{ left: x, top: y, width: USB_WALL_SIZE.width, ...hover?.style }}
      >
        <UsbWallVisual bank={source === "power_bank"} />
      </div>
    );
  }

  const asset = getBatteryAsset(source);
  return (
    <div
      data-instance="power-source"
      {...hover}
      className={`absolute ${hover?.className ?? ""}`}
      style={{ left: x, top: y, width: asset.width, ...hover?.style }}
    >
      <BatteryAssetVisual kind={source} />
    </div>
  );
}
