import type { CatalogPin, PinKind } from "@/lib/catalog/types";
import type { ExitDir } from "./types";

/**
 * Fixed geometry for the generic part drawing (GenericPart). Everything here
 * is pure and deterministic, so the drawn card, the wire anchors and the
 * diagram layout all agree on sizes. Units are CSS px, origin = card top-left.
 */
export const GP_ROW_H = 16;
export const GP_PAD_R = 3.5;
/** Card width when pins are split over two columns (boards and big parts). */
export const GP_WIDE_W = 208;
/** Card width when all pins sit on one side with the illustration beside. */
export const GP_NARROW_W = 176;
/** Header (illustration, name, category) above the pin rows of a two-column card. */
export const GP_WIDE_HEAD = 104;
/** Header (name, category) above the pin rows of a one-side card. */
export const GP_NARROW_HEAD = 42;
export const GP_NARROW_MIN_H = 92;
export const GP_ROWS_PAD_TOP = 6;
export const GP_ROWS_PAD_BOTTOM = 8;
/** Parts with at most this many pins use one side with the picture beside. */
export const GP_ONE_SIDE_MAX = 4;
/** Monospace label size and the room one label column has (about 15 characters). */
export const GP_LABEL_FONT = 10;
export const GP_CHAR_W = 6.02;
export const GP_LABEL_MAX_CHARS = 15;

export type GenericPad = {
  id: string;
  /** Text to print: the pin label, ellipsised when too long. */
  text: string;
  /** Full label, for the tooltip. */
  label: string;
  kind: PinKind | "other";
  side: "left" | "right";
  /** Pad centre, relative to the card's top-left. */
  x: number;
  y: number;
  exit: ExitDir;
};

export type GenericLayout = {
  width: number;
  height: number;
  oneSide: boolean;
  /** Height of the header block above the pin rows. */
  head: number;
  /** Box for the part's illustration. */
  image: { x: number; y: number; w: number; h: number };
  pads: GenericPad[];
};

type PinLike = Pick<CatalogPin, "id" | "label" | "kinds">;

const KIND_ORDER: PinKind[] = ["power", "ground", "i2c", "spi", "uart", "analog", "digital"];

/** The kind that colours a pad: power and ground first, then buses, then analog, then digital. */
export function primaryPinKind(kinds: readonly PinKind[] | undefined): PinKind | "other" {
  if (!kinds?.length) return "other";
  for (const kind of KIND_ORDER) if (kinds.includes(kind)) return kind;
  return "other";
}

/** Clip a label to `max` characters with an ellipsis. */
export function clipLabel(label: string, max = GP_LABEL_MAX_CHARS): string {
  const chars = Array.from(label);
  return chars.length <= max ? label : `${chars.slice(0, max - 1).join("")}…`;
}

export function genericPinLayout(part: { pins: readonly PinLike[] } | undefined): GenericLayout {
  const pins = part?.pins ?? [];
  const n = pins.length;
  const oneSide = n <= GP_ONE_SIDE_MAX;
  const width = oneSide ? GP_NARROW_W : GP_WIDE_W;
  const head = oneSide ? GP_NARROW_HEAD : GP_WIDE_HEAD;
  const rows = oneSide ? n : Math.ceil(n / 2);
  const rowsBottom = head + GP_ROWS_PAD_TOP + rows * GP_ROW_H + GP_ROWS_PAD_BOTTOM;
  const height = oneSide ? Math.max(rowsBottom, GP_NARROW_MIN_H) : rowsBottom;

  const pads = pins.map((pin, index): GenericPad => {
    const side = oneSide || index < rows ? "left" : "right";
    const row = side === "left" ? index : index - rows;
    return {
      id: pin.id,
      text: clipLabel(pin.label || pin.id),
      label: pin.label || pin.id,
      kind: primaryPinKind(pin.kinds),
      side,
      x: side === "left" ? 0 : width,
      y: head + GP_ROWS_PAD_TOP + (row + 0.5) * GP_ROW_H,
      exit: side === "left" ? { dx: -1, dy: 0 } : { dx: 1, dy: 0 },
    };
  });

  const image = oneSide
    ? { x: 84, y: head, w: width - 84 - 8, h: height - head - 8 }
    : { x: 12, y: 8, w: width - 24, h: 56 };

  return { width, height, oneSide, head, image, pads };
}
