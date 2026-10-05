import { BATTERY_RECORD_LIST } from "./battery-records";

/**
 * Thumbnails for the battery and power-supply parts, keyed by catalog `photoHint`.
 * One file per record in public/photos/batteries (written by scripts/gen-battery-art.mjs).
 * The four original power sources (9V, 2xAA, 3xAA, 18650) keep their older thumbnails.
 */
export const BATTERY_PART_MEDIA: Record<string, string> = {
  ...Object.fromEntries(
    BATTERY_RECORD_LIST.filter((record) => record.drawn === "image").map((record) => [
      record.photoHint,
      `/photos/batteries/${record.photoHint}.svg`,
    ]),
  ),
  "power-bank": "/photos/batteries/power-bank.svg",
};
