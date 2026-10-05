import { BB_COLS, BB_ORIGIN_X, BB_RAIL_Y, BB_ROW_Y, BB_STEP } from "./constants";
import type { Point } from "./types";

export function isBreadboardId(catalogId: string): boolean {
  return catalogId.includes("breadboard");
}

export function parseBreadboardRail(
  pinId: string,
): { side: "t" | "b"; polarity: "+" | "-"; col: number } | null {
  if (pinId === "+") return { side: "t", polarity: "+", col: 2 };
  if (pinId === "-") return { side: "b", polarity: "-", col: 2 };
  if (pinId === "+.t") return { side: "t", polarity: "+", col: 2 };
  if (pinId === "-.t") return { side: "t", polarity: "-", col: 2 };
  if (pinId === "+.b") return { side: "b", polarity: "+", col: 2 };
  if (pinId === "-.b") return { side: "b", polarity: "-", col: 2 };
  const match = /^([+-])\.(t|b)\.(\d+)$/i.exec(pinId);
  if (!match) return null;
  const col = Number(match[3]);
  if (col < 1 || col > BB_COLS) return null;
  return {
    polarity: match[1] as "+" | "-",
    side: match[2].toLowerCase() as "t" | "b",
    col,
  };
}

export function breadboardRailY(side: "t" | "b", polarity: "+" | "-"): number {
  if (side === "t") {
    return polarity === "+" ? BB_RAIL_Y.topPlus : BB_RAIL_Y.topMinus;
  }
  return polarity === "+" ? BB_RAIL_Y.botPlus : BB_RAIL_Y.botMinus;
}

export function breadboardHoleLocal(pinId: string): Point | null {
  const rail = parseBreadboardRail(pinId);
  if (rail) {
    return {
      x: BB_ORIGIN_X + (rail.col - 1) * BB_STEP,
      y: breadboardRailY(rail.side, rail.polarity),
    };
  }
  const match = /^([a-j])(\d+)$/i.exec(pinId);
  if (!match) return null;
  const row = match[1].toLowerCase();
  const col = Number(match[2]);
  const rowY = BB_ROW_Y[row];
  if (!rowY || col < 1 || col > BB_COLS) return null;
  return {
    x: BB_ORIGIN_X + (col - 1) * BB_STEP,
    y: rowY,
  };
}

export function breadboardCol(pinId: string): number | null {
  const rail = parseBreadboardRail(pinId);
  if (rail) return rail.col;
  const match = /^[a-j](\d+)$/i.exec(pinId);
  return match ? Number(match[1]) : null;
}
