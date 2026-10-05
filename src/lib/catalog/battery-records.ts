/**
 * The power-source table. ONE record per battery / supply, and everything else is
 * generated from it: the passive catalog entries (passives.ts), the voltage data
 * the validator uses, the diagram drawing and wire anchors, the PowerSelector
 * dropdown, the MCP ask_power_source options and the valid set_power_source ids.
 *
 * To add a battery:
 *   1. Make its drawing: add a line to scripts/gen-battery-art.mjs (or hand-draw an
 *      SVG with `term-plus` / `term-minus` shapes) and run `node scripts/gen-battery-art.mjs`.
 *      That writes public/assets/batteries/<file>.svg, the Parts-tab thumbnail and
 *      the terminal geometry in battery-geometry.generated.ts.
 *   2. Add one record below (use `cellPack(...)` for AA/AAA/C/D holders, or
 *      `defineBattery({...})` for anything else).
 *   3. Register its thumbnail in media-batteries.ts.
 * Keep existing ids unchanged: saved guides store them.
 *
 * Voltages are volts for the whole pack: `nominal` is the working voltage, `min` the
 * discharged cut-off and `max` the fresh / fully charged peak. Brand names do not
 * matter electrically, so none are used here.
 */
import { BATTERY_GEOMETRY } from "./battery-geometry.generated";
import type { BatteryTerminals } from "./batteries";
import type { BatteryChemistry, PartVariantNote } from "./types";

export type PowerGroup =
  | "alkaline"
  | "9v"
  | "nimh"
  | "lithium"
  | "coin"
  | "li-ion"
  | "lipo"
  | "dc-supply";

export const POWER_GROUP_LABELS: Record<PowerGroup | "usb", string> = {
  usb: "USB (easiest)",
  alkaline: "Alkaline AA / AAA / C / D",
  "9v": "9V battery",
  nimh: "Rechargeable NiMH (1.2 V per cell)",
  "lithium": "Lithium AA / AAA (not rechargeable)",
  coin: "Coin cell",
  "li-ion": "Rechargeable lithium-ion cells",
  lipo: "LiPo pouch / pack",
  "dc-supply": "Wall supply with barrel plug",
};

export type BatteryHolder =
  | "snap-9v"
  | "cell-holder"
  | "single-holder"
  | "coin-holder"
  | "pouch-jst"
  | "pack-lead"
  | "barrel-adapter";

export type BatteryRecord = {
  id: string;
  /** Catalog part id (passive.power.battery.<x> for batteries). */
  partId: string;
  /** Catalog part name. */
  name: string;
  /** Short name used on diagram wire labels, e.g. "4×AA cells". */
  label: string;
  group: PowerGroup;
  chemistry: BatteryChemistry;
  cells: number;
  nominal: number;
  min: number;
  max: number;
  rechargeable: boolean;
  /** Can only supply a few milliamps (coin cells). */
  lowCurrent?: boolean;
  holder: BatteryHolder;
  /** "inline": drawn by hand-written SVG in BatteryAssets.tsx. "image": the SVG file is shown as an image. */
  drawn: "inline" | "image";
  width: number;
  height: number;
  terminals: BatteryTerminals;
  asset: string;
  caption: string;
  photoHint: string;
  /** Solder-plan wording: "4xAA battery holder". */
  planName: string;
  description: string;
  photoCaption: string;
  identify: string;
  variants: PartVariantNote[];
  watchOuts: string[];
  /** Pin label suffixes, e.g. "top" gives "+ (top)". */
  pinNotes: { plus: string; minus: string };
  /** PowerSelector row. `fact` reads "Powered by <fact>". */
  choice: { label: string; fact: string; hint: string };
  /** ask_power_source row. */
  ask: { label: string; diagram: string; when: string };
  /** Extra spellings that map to this source (letters and digits only, lower case). */
  synonyms: string[];
};


/** Shown in every text that mentions marketing lines: brand never changes the electrical numbers. */
export const BRAND_NOTE =
  "Brand names and 'premium' or 'max' lines make no electrical difference: the voltage comes from the chemistry, not the label.";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 4.5 -> "4.5", 6 -> "6". */
export function fmtVolts(value: number): string {
  return String(round(value));
}

/** Which catalog pin voltage class a source belongs to (the catalog only knows 3v3 and 5v). */
export function batteryPinVoltageClass(nominal: number): "3v3" | "5v" {
  return nominal >= 4.25 ? "5v" : "3v3";
}

type Input = Omit<BatteryRecord, "partId" | "drawn" | "width" | "height" | "terminals" | "asset" | "photoHint" | "pinNotes"> & {
  partId?: string;
  drawn?: "inline" | "image";
  width?: number;
  height?: number;
  terminals?: BatteryTerminals;
  pinNotes?: BatteryRecord["pinNotes"];
};

type GeometryId = keyof typeof BATTERY_GEOMETRY;

function sideOf(exit: { dx: number; dy: number }): string {
  if (exit.dy < 0) return "top";
  if (exit.dy > 0) return "bottom";
  return exit.dx > 0 ? "right" : "left";
}

/**
 * Builds a full record. The drawing and wire anchors come from the generated
 * geometry table (image drawings) unless width/height/terminals are given
 * (hand-drawn inline SVGs).
 */
export function defineBattery<const T extends Input>(input: T): T & BatteryRecord {
  const file = input.id.replace(/_/g, "-");
  const generated = (BATTERY_GEOMETRY as Record<string, (typeof BATTERY_GEOMETRY)[GeometryId]>)[input.id];
  const width = input.width ?? generated?.width;
  const height = input.height ?? generated?.height;
  const terminals = input.terminals ?? generated?.terminals;
  if (width === undefined || height === undefined || !terminals) {
    throw new Error(`${input.id}: no drawing geometry (run scripts/gen-battery-art.mjs)`);
  }
  const suffix = input.id.replace(/^battery_|^supply_/, "");
  const record: BatteryRecord = {
    partId: input.id.startsWith("supply_")
      ? `passive.power.supply.${suffix}`
      : `passive.power.battery.${suffix}`,
    drawn: "image",
    pinNotes: { plus: sideOf(terminals.plusExit), minus: sideOf(terminals.minusExit) },
    ...input,
    width,
    height,
    terminals: terminals as BatteryTerminals,
    asset: `/assets/batteries/${file}.svg`,
    photoHint: file,
  };
  return record as T & BatteryRecord;
}

// ---------------------------------------------------------------------------
// AA / AAA / C / D holders and packs
// ---------------------------------------------------------------------------

type CellSize = "AA" | "AAA" | "C" | "D";
type CellChem = "alkaline" | "nimh" | "lithium";

const PER_CELL: Record<CellChem, { nominal: number; min: number; max: number }> = {
  alkaline: { nominal: 1.5, min: 1.0, max: 1.6 },
  nimh: { nominal: 1.2, min: 1.0, max: 1.4 },
  // Lithium primary cells (FR6 / FR03 type) read up to about 1.8 V fresh and stay flat near 1.5 V.
  lithium: { nominal: 1.5, min: 1.0, max: 1.8 },
};

const COUNT_WORD = ["", "One", "Two", "Three", "Four", "Five", "Six"];

function voltageAdvice(nominal: number, min: number): string {
  if (nominal < 2) return "A single cell is only about 1.5 V: it needs a boost converter for almost any board.";
  if (nominal <= 3.1) {
    return "Suits parts that run on about 2-3 V. Many 3.3 V boards need a boost converter because the pack sags below 3 V as it drains.";
  }
  if (nominal <= 4.8) {
    return "Often used on 5 V boards through the VIN pin, but the voltage falls as the cells drain, so check the board's minimum supply.";
  }
  return `About ${fmtVolts(nominal)} V: connect it to a board's VIN or barrel-jack input (check the board's range, it falls toward ${fmtVolts(min)} V as the cells drain), never to a 5 V or 3.3 V pin.`;
}

function cellPackText(chem: CellChem, size: CellSize, count: number, nominal: number, min: number, max: number) {
  const per = PER_CELL[chem];
  const sizeWord = count === 1 ? size : `${count}×${size}`;
  const holderWord = count === 1 ? `a single ${size} cell holder` : `a holder for ${count} ${size} cells in series`;
  const wires = "The holder has a red wire for + and a black wire for -.";
  const drain = `${fmtVolts(nominal)} V when fresh-ish, ${fmtVolts(min)} V when empty, up to ${fmtVolts(max)} V brand new`;
  const common = [
    "Insert the cells the right way round: polarity is printed in the holder (neighbouring cells face opposite ways).",
    "Never put a 14500 Li-ion cell (the same size as an AA but 3.7 V, not 1.5 V) in a holder meant for AA cells.",
  ];

  if (chem === "alkaline") {
    const bigNote =
      size === "C" || size === "D"
        ? `${size} cells hold much more energy than AA (they last far longer) and can supply more current, but the holder is bulky.`
        : "";
    return {
      description: [
        `${sizeWord} alkaline batteries in ${holderWord}: ${drain} (${fmtVolts(per.nominal)} V per cell).`,
        wires,
        voltageAdvice(nominal, min),
        bigNote,
        BRAND_NOTE,
      ]
        .filter(Boolean)
        .join(" "),
      identify: `A plastic holder for ${count === 1 ? "one" : COUNT_WORD[count]?.toLowerCase() ?? String(count)} ${size} ${count === 1 ? "cell" : "cells"} with two wires (red +, black -). The spring end of each cell is -, the bump end is +. Look for 'alkaline' and 1.5 V on the cells.`,
      variants: [
        {
          label: `${sizeWord} alkaline (this guide)`,
          detail: `About ${fmtVolts(nominal)} V fresh, falling toward ${fmtVolts(min)} V. Any brand or 'long-life' line is the same chemistry.`,
          matchesGuide: true,
        },
        {
          label: `${sizeWord} rechargeable NiMH`,
          detail: `Each cell is 1.2 V instead of 1.5 V, so the pack is only ${fmtVolts(round(1.2 * count))} V nominal. This matters for 5 V boards.`,
        },
      ],
      watchOuts: [
        ...common,
        "Do not mix new and old batteries, or different brands and types.",
        "Alkaline cells are not rechargeable: never try to charge them.",
        "Voltage drops as the batteries drain, so a board may reset or misbehave near the end of life.",
      ],
    };
  }

  if (chem === "nimh") {
    const alk = round(1.5 * count);
    const note = `Rechargeable NiMH cells are 1.2 V each (about 1.0 V empty, 1.4 V just charged), lower than the 1.5 V of an alkaline. ${count} NiMH ${size} = ${fmtVolts(nominal)} V, where the same ${count} alkaline = ${fmtVolts(alk)} V.`;
    const fiveV =
      count === 3
        ? " For a 5 V board that is too low: 3 NiMH (3.6 V) cannot feed a 5 V VIN pin, use 4 cells or a boost converter."
        : count === 4
          ? " For a 5 V board that is close but a little low: 4 NiMH (4.8 V) sags toward 4 V, so a board needing 4.5 V or more may reset as it drains."
          : count >= 6
            ? ` About ${fmtVolts(nominal)} V: use a board's VIN or barrel input, never a 5 V or 3.3 V pin.`
            : " Check the board's minimum supply before using it.";
    return {
      description: [
        `${sizeWord} rechargeable NiMH batteries in ${holderWord}.`,
        note + fiveV,
        wires,
        "They can be recharged hundreds of times in a NiMH charger. Low-self-discharge NiMH cells keep their charge for months on a shelf.",
        BRAND_NOTE,
      ].join(" "),
      identify: `A holder for ${count === 1 ? "one" : COUNT_WORD[count]?.toLowerCase() ?? String(count)} ${size} ${count === 1 ? "cell" : "cells"} with red (+) and black (-) wires. The cells say NiMH and 1.2 V, and a capacity in mAh (for example 2000 mAh for AA).`,
      variants: [
        {
          label: `${sizeWord} NiMH rechargeable (this guide)`,
          detail: `${fmtVolts(nominal)} V nominal, ${fmtVolts(min)} V empty, up to ${fmtVolts(max)} V fully charged.`,
          matchesGuide: true,
        },
        {
          label: `${sizeWord} alkaline`,
          detail: `${fmtVolts(alk)} V nominal: higher than NiMH, not rechargeable.`,
        },
      ],
      watchOuts: [
        `NiMH is lower voltage than alkaline: ${count} cells give ${fmtVolts(nominal)} V, not ${fmtVolts(alk)} V. Re-check the board's minimum supply.`,
        "Charge them only in a NiMH charger, never a plain power supply, and never mix NiMH with alkaline or with old cells.",
        ...common,
        "A board that is fine at 4.5 V alkaline may reset on 3.6 V NiMH; the voltage also sags more under a heavy load.",
      ],
    };
  }

  return {
    description: [
      `${sizeWord} lithium batteries (non-rechargeable, 1.5 V per cell) in ${holderWord}.`,
      `Voltage stays flat near ${fmtVolts(nominal)} V for most of the life, then drops quickly at the end. Brand new cells read higher, up to ${fmtVolts(max)} V, which can be above what a 5 V pin accepts.`,
      wires,
      "Lithium AA/AAA cells are lighter, work in the cold and last longer than alkaline in high-drain devices.",
      BRAND_NOTE,
    ].join(" "),
    identify: `A holder for ${COUNT_WORD[count]?.toLowerCase() ?? count} ${size} cells with two wires (red +, black -). The cells say lithium (often 'Li-FeS2') and 1.5 V. They feel lighter than alkaline and are NOT rechargeable.`,
    variants: [
      {
        label: `${sizeWord} lithium primary (this guide)`,
        detail: `${fmtVolts(nominal)} V nominal, ${fmtVolts(min)} V cut-off, up to ${fmtVolts(max)} V fresh.`,
        matchesGuide: true,
      },
      {
        label: `${sizeWord} alkaline`,
        detail: `Cheaper, same nominal ${fmtVolts(nominal)} V but a lower peak and a sloping discharge.`,
      },
    ],
    watchOuts: [
      "Lithium AA/AAA cells are NOT rechargeable: never charge them. Do not confuse them with rechargeable Li-ion cells such as 14500.",
      ...common,
      "Do not mix lithium with alkaline or with old cells.",
      "Fresh lithium cells read higher than alkaline (up to 1.8 V each), so a 3-cell pack can reach 5.4 V. Check the board's maximum supply.",
    ],
  };
}

function cellPack<const Id extends string>(opts: {
  id: Id;
  size: CellSize;
  count: number;
  chem: CellChem;
}) {
  const { id, size, count, chem } = opts;
  const per = PER_CELL[chem];
  const nominal = round(per.nominal * count);
  const min = round(per.min * count);
  const max = round(per.max * count);
  const text = cellPackText(chem, size, count, nominal, min, max);
  const chemName = chem === "alkaline" ? "" : chem === "nimh" ? " NiMH" : " Lithium";
  const sizeWord = count === 1 ? size : `${count}×${size}`;
  const cleanName = count === 1 ? `1×${size}${chemName} Battery` : `${count}×${size}${chemName} Batteries`;
  const lowerChem = chem === "alkaline" ? "alkaline" : chem === "nimh" ? "NiMH rechargeable" : "lithium";
  const pins = count % 2 === 0 ? "both leads leave from the top" : "+ on top, − on bottom";
  return defineBattery({
    id,
    name: cleanName,
    label: `${sizeWord}${chemName} cells`,
    group: chem === "alkaline" ? ("alkaline" as const) : chem === "nimh" ? ("nimh" as const) : ("lithium" as const),
    chemistry: chem === "alkaline" ? ("alkaline" as const) : chem === "nimh" ? ("nimh" as const) : ("lithium" as const),
    cells: count,
    nominal,
    min,
    max,
    rechargeable: chem === "nimh",
    holder: count === 1 ? ("single-holder" as const) : ("cell-holder" as const),
    caption: `${sizeWord} ${lowerChem} — ${fmtVolts(nominal)} V, ${pins}`,
    planName: `${count}x${size} ${lowerChem} battery holder`,
    photoCaption: `${sizeWord} ${lowerChem} holder: the red wire is +, the black wire is -.`,
    ...text,
    choice: {
      label: `${count === 1 ? `1 ${size}` : `${count} ${size}`}${chem === "nimh" ? " rechargeable (NiMH)" : chem === "lithium" ? " lithium" : ""} ${count === 1 ? "battery" : "batteries"}`,
      fact: `${count === 1 ? `1 ${size}` : `${count} ${size}`}${chem === "nimh" ? " rechargeable (NiMH)" : chem === "lithium" ? " lithium" : ""} ${count === 1 ? "battery" : "batteries"}`,
      hint:
        chem === "nimh"
          ? `Rechargeable, but only 1.2 V per cell (${fmtVolts(nominal)} V in total), lower than the same count of alkaline.`
          : chem === "lithium"
            ? `Not rechargeable. Flat ${fmtVolts(nominal)} V, up to ${fmtVolts(max)} V when brand new.`
            : `${fmtVolts(nominal)} V when fresh. Easy to find; good for projects you carry around.`,
    },
    ask: {
      label: `${cleanName.replace(/ Batter(?:y|ies)$/, "")} pack (~${fmtVolts(nominal)}V)`,
      diagram: `${count === 1 ? "Single" : `${count}-cell`} ${size} holder with red/black leads to the board.`,
      when:
        chem === "nimh"
          ? `Rechargeable. Remember NiMH is only 1.2 V per cell, so ${fmtVolts(nominal)} V in total (alkaline would be ${fmtVolts(round(1.5 * count))} V).`
          : chem === "lithium"
            ? `Non-rechargeable, flat ${fmtVolts(nominal)} V, good in the cold. Fresh cells read up to ${fmtVolts(max)} V.`
            : nominal < 4
              ? "Low-voltage portable builds; confirm the board accepts this voltage or add a boost converter."
              : nominal <= 5
                ? "Portable with headroom for a 5 V board via VIN; check the board's minimum supply."
                : "Portable builds that feed a board's VIN or barrel input (never a 5 V or 3.3 V pin).",
    },
    synonyms: [],
  });
}

const ALK = "alkaline" as const;

// ---------------------------------------------------------------------------
// The table. Order here is the order shown in the PowerSelector.
// ---------------------------------------------------------------------------

export const BATTERY_RECORDS = [
  // --- Alkaline AA / AAA / C / D ----------------------------------------
  cellPack({ id: "battery_1aa", size: "AA", count: 1, chem: ALK }),
  defineBattery({
    id: "battery_2aa",
    name: "2×AA Batteries",
    label: "2×AA cells",
    group: "alkaline" as const,
    chemistry: "alkaline" as const,
    cells: 2,
    nominal: 3,
    min: 2,
    max: 3.2,
    rechargeable: false,
    holder: "cell-holder" as const,
    drawn: "inline" as const,
    width: 160,
    height: 170,
    terminals: {
      plus: { x: 80, y: 18 },
      minus: { x: 80, y: 148 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: 1 },
    },
    caption: "2×AA — + nub on top, − flat on bottom",
    planName: "2xAA battery holder",
    description:
      "Two AA batteries in a holder, about 3 V (2 x 1.5 V) when fresh. The holder has a red wire for + and a black wire for -. Typically used for low-power projects on boards that accept about 3 V; check the board's minimum supply first. " +
      BRAND_NOTE,
    photoCaption: "2xAA holder: the red wire is +, the black wire is -.",
    identify:
      "A plastic holder for two AA cells with two wires. Spring end of each cell is -, bump end is +. Red wire = +, black = -.",
    variants: [
      {
        label: "2xAA alkaline (this guide)",
        detail: "About 3.0 V fresh, falling toward 2 V as it empties. Check that your board or module accepts that range.",
        matchesGuide: true,
      },
      {
        label: "2xAA NiMH rechargeable",
        detail: "About 2.4 V nominal; may be too low for some 3.3 V parts.",
      },
    ],
    watchOuts: [
      "Check that the board accepts about 2-3 V; many 3.3 V boards need close to 3.0 V and may need a voltage booster.",
      "Insert cells the right way round: polarity is marked in the holder.",
      "Do not mix new and old batteries or different brands.",
      "Never put a 14500 Li-ion cell (AA size but 3.7 V) in an AA holder.",
    ],
    pinNotes: { plus: "top", minus: "bottom" },
    choice: {
      label: "2 AA batteries",
      fact: "2 AA batteries",
      hint: "Small and light. Fine for low-power projects you carry around.",
    },
    ask: {
      label: "2×AA battery pack (~3V)",
      diagram: "Two-AA holder with red/black leads to VIN and GND.",
      when: "Low-voltage portable; may need 3.3V board or boost — confirm MCU supply.",
    },
    synonyms: [],
  }),
  defineBattery({
    id: "battery_3aa",
    name: "3×AA Batteries",
    label: "3×AA cells",
    group: "alkaline" as const,
    chemistry: "alkaline" as const,
    cells: 3,
    nominal: 4.5,
    min: 3,
    max: 4.8,
    rechargeable: false,
    holder: "cell-holder" as const,
    drawn: "inline" as const,
    width: 170,
    height: 170,
    terminals: {
      plus: { x: 85, y: 16 },
      minus: { x: 85, y: 150 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: 1 },
    },
    caption: "3×AA — + on top, − on bottom",
    planName: "3xAA battery holder",
    description:
      "Three AA batteries in a holder, about 4.5 V when fresh. Red wire is +, black wire is -. Often used with 5 V boards such as Arduinos, within the board's accepted voltage range. " +
      BRAND_NOTE,
    photoCaption: "3xAA holder: red wire is +, black wire is -.",
    identify: "Plastic holder for three AA cells in a row with two wires (red +, black -).",
    variants: [
      {
        label: "3xAA alkaline (this guide)",
        detail: "About 4.5 V fresh and falling as it drains. Check the board's minimum supply voltage.",
        matchesGuide: true,
      },
      {
        label: "3xAA NiMH rechargeable",
        detail: "Only 3.6 V nominal (1.2 V per cell): too low for a 5 V board. Use 4 cells or a boost converter.",
      },
      {
        label: "4xAA holder",
        detail: "About 6 V. Suitable for a board's VIN, not for 5 V pins.",
      },
    ],
    watchOuts: [
      "Voltage drops as batteries drain, so a board may reset or misbehave near the end of life.",
      "Insert cells the right way round and connect red to + and black to GND.",
      "Do not mix old and new batteries.",
      "Never put a 14500 Li-ion cell (AA size but 3.7 V) in an AA holder.",
    ],
    pinNotes: { plus: "top", minus: "bottom" },
    choice: {
      label: "3 AA batteries",
      fact: "3 AA batteries",
      hint: "Common and easy to find. Good for projects you carry around.",
    },
    ask: {
      label: "3×AA battery pack (~4.5V)",
      diagram: "Three-AA holder with +/− to VIN and GND.",
      when: "Portable with a bit more headroom than 2×AA.",
    },
    synonyms: [],
  }),
  cellPack({ id: "battery_4aa", size: "AA", count: 4, chem: ALK }),
  cellPack({ id: "battery_6aa", size: "AA", count: 6, chem: ALK }),
  cellPack({ id: "battery_2aaa", size: "AAA", count: 2, chem: ALK }),
  cellPack({ id: "battery_3aaa", size: "AAA", count: 3, chem: ALK }),
  cellPack({ id: "battery_4aaa", size: "AAA", count: 4, chem: ALK }),
  cellPack({ id: "battery_1c", size: "C", count: 1, chem: ALK }),
  cellPack({ id: "battery_1d", size: "D", count: 1, chem: ALK }),
  cellPack({ id: "battery_2d", size: "D", count: 2, chem: ALK }),

  // --- 9V ----------------------------------------------------------------
  defineBattery({
    id: "battery_9v",
    name: "9V Battery (snap)",
    label: "9V battery",
    group: "9v" as const,
    chemistry: "alkaline" as const,
    cells: 6,
    nominal: 9,
    min: 6,
    max: 9.6,
    rechargeable: false,
    holder: "snap-9v" as const,
    drawn: "inline" as const,
    width: 160,
    height: 150,
    terminals: {
      plus: { x: 98, y: 22 },
      minus: { x: 62, y: 22 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: -1 },
    },
    caption: "9V snap — both terminals on top",
    planName: "9V battery",
    description:
      "A 9 V rectangular battery with two snap terminals on top. The smaller round terminal is + and the larger hexagon-shaped one is -. A snap connector with red (+) and black (-) wires clips on. Use it into a board's VIN pin or barrel jack, not into a 5 V or 3.3 V pin. " +
      BRAND_NOTE,
    photoCaption:
      "9 V rectangular battery with both snap terminals on the top face (small round = +, larger hexagon = -).",
    identify:
      "Rectangular block about 48 x 26 x 17 mm labelled 9V (PP3 / 6LR61 alkaline), two snaps on one end. Clip on a snap lead: red = +, black = -.",
    variants: [
      {
        label: "9 V alkaline PP3 (this guide)",
        detail: "Roughly 9 V new, falling as it drains. Low capacity (a few hundred mAh), best for small, low-power builds.",
        matchesGuide: true,
      },
      {
        label: "Rechargeable 9 V (NiMH or Li-ion)",
        detail: "Nominal voltage may differ (for example 8.4 V); check the label against the board's VIN range.",
      },
    ],
    watchOuts: [
      "Connect red to VIN (or a regulator input) and black to GND. Reversed polarity can destroy the board instantly.",
      "9 V must not go to a 5 V or 3.3 V pin.",
      "Small 9 V cells give little current and drain fast with motors, servos, Wi-Fi boards or LED strips.",
    ],
    pinNotes: { plus: "top snap", minus: "top snap" },
    choice: { label: "9V battery", fact: "a 9V battery", hint: "Good for projects you carry around." },
    ask: {
      label: "9V battery (snap connector)",
      diagram: "Classic 9V snap with +/− leads to VIN and GND.",
      when: "Compact portable builds; check board VIN range (often 7–12V on Uno).",
    },
    synonyms: ["9v", "9volt", "9vbattery", "9voltbattery", "9vsnap", "9vpp3", "pp3"],
  }),

  // --- NiMH ---------------------------------------------------------------
  cellPack({ id: "battery_2aa_nimh", size: "AA", count: 2, chem: "nimh" }),
  cellPack({ id: "battery_3aa_nimh", size: "AA", count: 3, chem: "nimh" }),
  cellPack({ id: "battery_4aa_nimh", size: "AA", count: 4, chem: "nimh" }),
  cellPack({ id: "battery_6aa_nimh", size: "AA", count: 6, chem: "nimh" }),
  cellPack({ id: "battery_2aaa_nimh", size: "AAA", count: 2, chem: "nimh" }),
  cellPack({ id: "battery_3aaa_nimh", size: "AAA", count: 3, chem: "nimh" }),
  cellPack({ id: "battery_4aaa_nimh", size: "AAA", count: 4, chem: "nimh" }),

  // --- Lithium primary AA / AAA -------------------------------------------
  cellPack({ id: "battery_2aa_lithium", size: "AA", count: 2, chem: "lithium" }),
  cellPack({ id: "battery_3aa_lithium", size: "AA", count: 3, chem: "lithium" }),
  cellPack({ id: "battery_2aaa_lithium", size: "AAA", count: 2, chem: "lithium" }),
  cellPack({ id: "battery_3aaa_lithium", size: "AAA", count: 3, chem: "lithium" }),

  defineBattery({
    id: "battery_cr123a",
    name: "CR123A Lithium Cell",
    label: "CR123A lithium",
    group: "lithium" as const,
    chemistry: "lithium" as const,
    cells: 1,
    nominal: 3,
    min: 2,
    max: 3.3,
    rechargeable: false,
    holder: "single-holder" as const,
    caption: "CR123A 3V lithium — + top",
    planName: "CR123A battery",
    description:
      "A single CR123A lithium cell (also called 123A or CR17345): 3 V nominal, about 3.3 V new, 2.0 V empty. It is not rechargeable. Short and fat (17 mm wide, 34.5 mm long), with the + end marked and slightly raised. It gives decent current and works in the cold. " +
      BRAND_NOTE,
    photoCaption: "CR123A cell: the end with the raised button is +.",
    identify:
      "A short, fat cylinder about 17 mm wide and 34 mm long, marked CR123A and 3V. A rechargeable look-alike called RCR123A or 16340 is 3.7 V (4.2 V full): do not confuse the two.",
    variants: [
      {
        label: "CR123A lithium, 3 V (this guide)",
        detail: "Not rechargeable, roughly 1500 mAh. Good for sensors and small radios.",
        matchesGuide: true,
      },
      {
        label: "RCR123A / 16340 (rechargeable)",
        detail: "Same size but 3.7 V nominal (4.2 V full). Different voltage: treat it as a Li-ion cell, not this part.",
      },
    ],
    watchOuts: [
      "CR123A cells are not rechargeable: never charge them. Do not mix them up with the 3.7 V rechargeable look-alikes (RCR123A / 16340).",
      "Never short the terminals or reverse polarity: lithium cells can overheat and ignite.",
      "Do not mix old and new cells or use damaged cells.",
    ],
    pinNotes: { plus: "top", minus: "bottom" },
    choice: {
      label: "CR123A lithium battery",
      fact: "a CR123A lithium battery",
      hint: "3 V, not rechargeable. Compact and reliable for small sensors.",
    },
    ask: {
      label: "CR123A lithium cell (3V)",
      diagram: "Single CR123A cell in a holder; +/− to the board's 3.3V-class supply.",
      when: "Compact 3 V, non-rechargeable. Fresh cells read up to about 3.3 V; check the board's maximum.",
    },
    synonyms: ["cr123a", "cr123", "123a", "cr123acell", "cr123abattery", "cr17345"],
  }),

  // --- Coin cell ------------------------------------------------------------
  defineBattery({
    id: "battery_cr2032",
    name: "CR2032 Coin Cell (with holder)",
    label: "CR2032 coin cell",
    group: "coin" as const,
    chemistry: "coin-lithium" as const,
    cells: 1,
    nominal: 3,
    min: 2,
    max: 3.3,
    rechargeable: false,
    lowCurrent: true,
    holder: "coin-holder" as const,
    caption: "CR2032 coin cell — both leads on top",
    planName: "CR2032 coin cell holder",
    description:
      "A CR2032 lithium coin cell (3 V nominal, about 3.3 V new, 2.0 V empty) in a holder with a red (+) and a black (-) lead. It is small and light but can only supply a few milliamps: fine for a sleeping microcontroller, an LED or a sensor reading, not for motors, servos, buzzers, LED strips, or the short Wi-Fi / Bluetooth bursts of an ESP32 unless a large capacitor sits across the supply. CR2025 (thinner) and CR2016 (thinnest) are electrically the same 3 V; they only hold less energy. " +
      BRAND_NOTE,
    photoCaption: "CR2032 coin cell in its holder: red lead is +, black lead is -.",
    identify:
      "A flat silver disc 20 mm wide and 3.2 mm thick, marked CR2032 and 3V, in a plastic holder with two wires. The side with the text is +. CR2025 is 2.5 mm thick and CR2016 is 1.6 mm thick (both 20 mm wide).",
    variants: [
      {
        label: "CR2032 (this guide)",
        detail: "3 V, about 220 mAh. The most common coin cell and the best energy of the 20 mm cells.",
        matchesGuide: true,
      },
      {
        label: "CR2025 / CR2016",
        detail: "Also 3 V, same diameter but thinner, so less energy (about 150 mAh and 90 mAh). They fit a CR2032 holder only if it grips them.",
      },
      {
        label: "LIR2032 (rechargeable)",
        detail: "Looks the same but is a 3.6 V rechargeable cell. Do not swap it for a CR2032 without checking the board.",
      },
    ],
    watchOuts: [
      "A coin cell supplies only a few mA. Wi-Fi / Bluetooth bursts, motors and servos will make the board reset ('brownout'); add a 100-470 µF capacitor across the supply and ground, or use a bigger source.",
      "CR cells are not rechargeable: never charge them.",
      "The voltage sags as it drains and under load; a 3.3 V board may stop below about 2.7 V.",
      "Keep coin cells away from small children and pets: swallowing one is dangerous.",
    ],
    pinNotes: { plus: "top", minus: "top" },
    choice: {
      label: "CR2032 coin cell",
      fact: "a CR2032 coin cell",
      hint: "Tiny and light, but only a few milliamps: for very low-power builds, not Wi-Fi or motors.",
    },
    ask: {
      label: "CR2032 coin cell (3V)",
      diagram: "Coin-cell holder with red/black leads to the board's 3.3V-class supply pin and GND.",
      when: "Tiny, very low power (sleeping microcontroller, LED blink, sensor). Not for motors, servos or Wi-Fi bursts without a capacitor.",
    },
    synonyms: [
      "cr2032",
      "cr2032coin",
      "cr2032coincell",
      "cr2032battery",
      "cr2025",
      "cr2025coincell",
      "cr2016",
      "cr2016coincell",
      "coincell",
      "coinbattery",
      "buttoncell",
      "3vcoincell",
      "2032",
    ],
  }),

  // --- Lithium-ion cylinders -------------------------------------------------
  defineBattery({
    id: "battery_18650",
    name: "18650 Li-ion Cell",
    label: "18650 Li-ion",
    group: "li-ion" as const,
    chemistry: "li-ion" as const,
    cells: 1,
    nominal: 3.7,
    min: 3,
    max: 4.2,
    rechargeable: true,
    holder: "single-holder" as const,
    drawn: "inline" as const,
    width: 120,
    height: 180,
    terminals: {
      plus: { x: 60, y: 14 },
      minus: { x: 60, y: 166 },
      plusExit: { dx: 0, dy: -1 },
      minusExit: { dx: 0, dy: 1 },
    },
    caption: "18650 — + button top, − flat bottom",
    planName: "18650 battery",
    description:
      "A single 18650 rechargeable lithium-ion cell, 3.7 V nominal (about 4.2 V full, 3.0 V empty). The flat end is - and the end with the raised button is +. It can deliver a lot of current, so it needs a proper holder and, ideally, a protected cell or a charger-protection board (such as a TP4056 module).",
    photoCaption: "18650 cell: raised button end is +, flat end is -.",
    identify:
      "Cylinder about 18 mm wide and 65 mm long, like a long AA battery, with a printed rating such as 2600 mAh. Protected cells are slightly longer and have a small circuit under the label.",
    variants: [
      {
        label: "18650 Li-ion, 3.7 V (this guide)",
        detail: "Typical capacity 2000-3500 mAh. Choose a protected cell from a reputable brand.",
        matchesGuide: true,
      },
      {
        label: "Unprotected vs protected cell",
        detail: "A protected cell has an internal safety circuit (cuts off on short circuit and over-discharge). Prefer it as a beginner. An unprotected cell needs a protection board such as a TP4056 module with protection.",
      },
    ],
    watchOuts: [
      "Do not reverse polarity. Prefer a holder with protection for beginners.",
      "Never short the terminals or leave a bare cell loose in a bag with metal: it can overheat and ignite.",
      "Charge only with a Li-ion charger, never with a plain power supply. Do not use damaged or swollen cells.",
    ],
    pinNotes: { plus: "top", minus: "bottom" },
    choice: {
      label: "18650 battery",
      fact: "an 18650 battery",
      hint: "A rechargeable cell that lasts a long time. Handle with care.",
    },
    ask: {
      label: "18650 Li-ion cell (~3.7V)",
      diagram: "Cylindrical 18650 in a holder; +/− to VIN and GND.",
      when: "Rechargeable portable; use a protected cell and proper charger — never guess polarity.",
    },
    synonyms: ["18650", "18650cell", "18650battery", "liion18650", "lithium18650"],
  }),
  defineBattery({
    id: "battery_21700",
    name: "21700 Li-ion Cell",
    label: "21700 Li-ion",
    group: "li-ion" as const,
    chemistry: "li-ion" as const,
    cells: 1,
    nominal: 3.7,
    min: 3,
    max: 4.2,
    rechargeable: true,
    holder: "single-holder" as const,
    caption: "21700 — + button top, − flat bottom",
    planName: "21700 battery",
    description:
      "A single 21700 rechargeable lithium-ion cell: like an 18650 but fatter (21 mm wide, 70 mm long) with more capacity (typically 4000-5000 mAh). 3.7 V nominal, about 4.2 V full, 3.0 V empty. The raised button end is + and the flat end is -. Use it in a proper holder with a protection circuit; it can deliver a lot of current.",
    photoCaption: "21700 cell: raised button end is +, flat end is -.",
    identify:
      "A cylinder about 21 mm wide and 70 mm long (an 18650 is 18 x 65 mm), printed with a capacity such as 4000 mAh. Protected cells are a few mm longer and have a small circuit under the wrap.",
    variants: [
      {
        label: "21700 Li-ion, 3.7 V (this guide)",
        detail: "Typical 3000-5000 mAh. Does not fit an 18650 holder.",
        matchesGuide: true,
      },
      {
        label: "Protected vs unprotected",
        detail: "A protected cell has a small safety board (short-circuit and over-discharge cut-off) and is a few mm longer. An unprotected cell needs a protection board in the circuit.",
      },
    ],
    watchOuts: [
      "Do not reverse polarity and never short the terminals: a shorted lithium cell can overheat and ignite.",
      "Charge only with a Li-ion charger, never with a plain power supply. A TP4056 module can charge it (set the current to about 1 A or less).",
      "Prefer a protected cell, or add a protection board. Do not use damaged, dented or swollen cells.",
      "The 21700 does not fit an 18650 holder.",
    ],
    pinNotes: { plus: "top", minus: "bottom" },
    choice: {
      label: "21700 battery",
      fact: "a 21700 battery",
      hint: "Like an 18650 but bigger and longer-lasting. Rechargeable, handle with care.",
    },
    ask: {
      label: "21700 Li-ion cell (~3.7V)",
      diagram: "Cylindrical 21700 in a holder; +/− to the board.",
      when: "Rechargeable portable with long runtime; use a protected cell and a proper charger.",
    },
    synonyms: ["21700", "21700cell", "21700battery", "liion21700", "lithium21700"],
  }),
  defineBattery({
    id: "battery_14500",
    name: "14500 Li-ion Cell (AA size, 3.7 V)",
    label: "14500 Li-ion",
    group: "li-ion" as const,
    chemistry: "li-ion" as const,
    cells: 1,
    nominal: 3.7,
    min: 3,
    max: 4.2,
    rechargeable: true,
    holder: "single-holder" as const,
    caption: "14500 — AA size but 3.7 V, + top",
    planName: "14500 battery",
    description:
      "A single 14500 rechargeable lithium-ion cell. It is exactly the SIZE of an AA battery (14 mm wide, 50 mm long) but it is 3.7 V (4.2 V full, 3.0 V empty), NOT a 1.5 V AA. Putting it in a device built for AA cells can destroy that device. Typical capacity 600-1000 mAh. The raised button end is + and the flat end is -.",
    photoCaption: "14500 cell: AA size but 3.7 V. Raised button end is +, flat end is -.",
    identify:
      "Looks like an AA battery, but the label says 14500, Li-ion and 3.7 V (not 1.5 V). Often has a raised button on the + end. An AA battery says 1.5 V and alkaline / NiMH / lithium.",
    variants: [
      {
        label: "14500 Li-ion, 3.7 V (this guide)",
        detail: "Rechargeable, about 600-1000 mAh. Needs a Li-ion charger.",
        matchesGuide: true,
      },
      {
        label: "Protected vs unprotected",
        detail: "A protected cell has a small safety board and is a bit longer. An unprotected one needs a protection board in the circuit.",
      },
    ],
    watchOuts: [
      "This is NOT a 1.5 V AA battery, even though it is the same size. Never put it in an AA holder meant for alkaline / NiMH cells: it supplies 3.7 V and can destroy the board.",
      "Do not reverse polarity and never short the terminals: a shorted lithium cell can overheat and ignite.",
      "Charge only with a Li-ion charger, never with a plain power supply or an AA / NiMH charger.",
      "Do not use damaged or swollen cells.",
    ],
    pinNotes: { plus: "top", minus: "bottom" },
    choice: {
      label: "14500 battery (AA size, 3.7 V)",
      fact: "a 14500 battery",
      hint: "Looks like an AA but is 3.7 V, not 1.5 V. Rechargeable, handle with care.",
    },
    ask: {
      label: "14500 Li-ion cell (AA size, ~3.7V)",
      diagram: "AA-size lithium-ion cell in a single-cell holder; +/− to the board.",
      when: "Small rechargeable. WARNING: AA size but 3.7 V, never put it in an AA holder.",
    },
    synonyms: ["14500", "14500cell", "14500battery", "liion14500", "lithium14500"],
  }),

  // --- LiPo ------------------------------------------------------------------
  defineBattery({
    id: "battery_lipo_1s",
    name: "1S LiPo Pouch Cell (JST lead)",
    label: "1S LiPo pouch",
    group: "lipo" as const,
    chemistry: "lipo" as const,
    cells: 1,
    nominal: 3.7,
    min: 3,
    max: 4.2,
    rechargeable: true,
    holder: "pouch-jst" as const,
    caption: "1S LiPo pouch — JST lead, both wires on top",
    planName: "1S LiPo pouch battery",
    description:
      "A single flat lithium-polymer ('LiPo') pouch cell in a soft foil bag, 3.7 V nominal (4.2 V full, 3.0 V empty), usually with a small protection circuit and a 2-pin JST-PH (2 mm) connector on short red and black wires. It comes in many sizes: from about 100-200 mAh (the size of a postage stamp) to 2000 mAh or more (the size of a small phone). WARNING: the pouch is easily damaged; never puncture, bend, crush or short it, and never charge it unattended. Charge only with a 1S LiPo charger (for example a TP4056 module).",
    photoCaption: "1S LiPo pouch: red lead is +, black lead is -, through a small JST connector. Check polarity first.",
    identify:
      "A flat soft foil bag with two thin wires, a small green protection board at one end and a white 2-pin plug (JST-PH is 2.0 mm pitch). The label says 3.7V and a capacity in mAh. The size depends on capacity.",
    variants: [
      {
        label: "Small, 100-250 mAh",
        detail: "About 20-30 mm square and 4-5 mm thick. Good for tiny sensors and wearables; short runtime.",
        matchesGuide: true,
      },
      {
        label: "Medium, 400-1200 mAh",
        detail: "About 30 x 40 to 35 x 55 mm, 5-8 mm thick. A popular size for small boards.",
      },
      {
        label: "Large, 2000 mAh and up",
        detail: "About 50 x 60 mm or bigger, 7-10 mm thick. Long runtime; check it fits your case.",
      },
      {
        label: "No protection circuit",
        detail: "A bare pouch cell without a protection board is risky: add one (or a charger board with protection) before use.",
      },
    ],
    watchOuts: [
      "WARNING: a LiPo cell can catch fire if it is shorted, punctured, crushed, over-charged or over-discharged. Never short the wires, never use a swollen or damaged pouch, and charge on a non-flammable surface.",
      "Check the protection circuit: many cheap cells have none. A cell without it must not be run below 3.0 V or shorted.",
      "JST connector polarity is NOT standard: two makers can sell the same plug with + and − swapped. Check the red wire is + with a multimeter, or compare with the board's marking, BEFORE you plug it in. A swapped plug destroys the board.",
      "Charge only with a 1S LiPo / Li-ion charger (such as a TP4056 module), at no more than about 1C (a 500 mAh cell at 500 mA or less).",
      "4.2 V when full is above what a 3.3 V pin accepts: connect it to a regulator input (VIN / battery-in pin), not directly to a 3V3 pin.",
    ],
    pinNotes: { plus: "JST red", minus: "JST black" },
    choice: {
      label: "LiPo pouch (1S, 3.7 V)",
      fact: "a 1S LiPo pouch battery",
      hint: "Thin and light and rechargeable. Handle with care: never short or puncture it.",
    },
    ask: {
      label: "1S LiPo pouch cell (3.7V, JST-PH)",
      diagram: "Flat LiPo pouch with JST lead; +/− to the board's battery or VIN input.",
      when: "Thin rechargeable portable. WARNING: check the protection circuit and the JST polarity, never short it, charge with a 1S charger.",
    },
    synonyms: [
      "lipo",
      "lipo1s",
      "1slipo",
      "lipopouch",
      "lipobattery",
      "lipocell",
      "lithiumpolymer",
      "37vlipo",
      "lipo37v",
      "1slipopouch",
      "lipojst",
      "jstlipo",
    ],
  }),
  defineBattery({
    id: "battery_lipo_2s",
    name: "2S LiPo Pack (7.4 V)",
    label: "2S LiPo pack",
    group: "lipo" as const,
    chemistry: "lipo" as const,
    cells: 2,
    nominal: 7.4,
    min: 6,
    max: 8.4,
    rechargeable: true,
    holder: "pack-lead" as const,
    caption: "2S LiPo — 7.4 V, main lead on top",
    planName: "2S LiPo battery pack",
    description:
      "A 2S LiPo pack: two lithium-polymer cells in series, 7.4 V nominal (8.4 V full, 6.0 V empty). It has a thick two-wire main lead (often a JST or XT30 connector) and a thin 3-pin balance lead used only for charging. 7.4 V suits a board's VIN or barrel input (an Arduino wants 7-12 V) or a buck converter; it must NEVER go to a 5 V or 3.3 V pin. WARNING: LiPo packs can catch fire if shorted, punctured or over-charged.",
    photoCaption: "2S LiPo pack: red main wire is +, black is -. The thin white balance lead is for charging only.",
    identify:
      "A flat or brick-shaped pack in shrink wrap marked 2S and 7.4V with a capacity in mAh. Two thick wires (red, black) to a power plug and a thin white 3-wire plug (the balance lead).",
    variants: [
      {
        label: "2S LiPo, 7.4 V (this guide)",
        detail: "Typical 500-5000 mAh. Used for drones, robots and motor builds.",
        matchesGuide: true,
      },
      {
        label: "2S Li-ion pack with protection (7.4 V)",
        detail: "Two 18650 cells in series with a protection board: the same voltage but more rugged.",
      },
    ],
    watchOuts: [
      "WARNING: never short the wires, puncture or crush the pack, or charge it unattended. Use a balance charger made for 2S packs: the thin balance lead is for charging only.",
      "7.4 V (up to 8.4 V full) must not go to a 5 V or 3.3 V pin. Use VIN / the barrel input, or a buck converter down to 5 V.",
      "Connector polarity is NOT standard: check with a multimeter which wire is + before plugging in.",
      "Do not run it below 6.0 V (3.0 V per cell): use a pack with a low-voltage cut-off or a low-voltage alarm.",
    ],
    pinNotes: { plus: "top", minus: "top" },
    choice: {
      label: "2S LiPo pack (7.4 V)",
      fact: "a 2S LiPo battery pack",
      hint: "7.4 V rechargeable, for VIN or motor builds. Handle with care.",
    },
    ask: {
      label: "2S LiPo pack (7.4V)",
      diagram: "2S LiPo pack with main lead; +/− to VIN (or a buck converter) and GND.",
      when: "Motors and robots. WARNING: 7.4 V must never go to a 5 V pin; use VIN or a buck converter. Needs a 2S balance charger.",
    },
    synonyms: ["lipo2s", "2slipo", "2slipopack", "lipo74v", "74vlipo", "2slipobattery", "lipo2spack"],
  }),

  // --- Barrel-plug wall supplies --------------------------------------------
  defineBattery({
    id: "supply_barrel_9v",
    name: "9 V DC Wall Supply (barrel plug)",
    label: "9V DC supply",
    group: "dc-supply" as const,
    chemistry: "dc-supply" as const,
    cells: 0,
    nominal: 9,
    min: 8.55,
    max: 9.45,
    rechargeable: false,
    holder: "barrel-adapter" as const,
    caption: "9V DC supply — barrel plug to screw block",
    planName: "9V DC wall supply",
    description:
      "A regulated 9 V DC wall adapter with a round barrel plug (centre pin +, outer sleeve -, the usual 5.5 x 2.1 mm). Plug it into a board's barrel jack, or use a barrel-to-screw-terminal adapter to reach VIN and GND. 9 V is right for an Arduino's barrel jack / VIN (7-12 V) but is far too high for any 5 V or 3.3 V pin. The adapter does the safe mains conversion for you.",
    photoCaption: "9 V DC wall supply with a barrel plug (centre +) and screw-terminal adapter.",
    identify:
      "A plastic brick with mains prongs and a thin cable ending in a round barrel plug. The label says OUTPUT DC 9V with a current (for example 1 A) and a small diagram showing centre positive.",
    variants: [
      {
        label: "9 V regulated, 1 A (this guide)",
        detail: "Stable 9 V. Check the polarity symbol: centre positive is the norm.",
        matchesGuide: true,
      },
      {
        label: "Unregulated 9 V",
        detail: "Cheap 'transformer' types read 12 V or more with no load. Prefer a regulated supply.",
      },
    ],
    watchOuts: [
      "Only use a regulated adapter of the right voltage. Check the plug polarity (centre +): the opposite can destroy the board.",
      "Never connect 9 V to a 5 V or 3.3 V pin; it belongs on VIN or the barrel jack.",
      "Do not open or modify the adapter: it carries mains voltage inside.",
    ],
    pinNotes: { plus: "screw block", minus: "screw block" },
    choice: {
      label: "9V wall adapter (barrel plug)",
      fact: "a 9V wall adapter",
      hint: "Mains-powered. Plugs into the board's round barrel jack. Not for 5 V pins.",
    },
    ask: {
      label: "9V DC wall adapter (barrel jack)",
      diagram: "9 V brick with a barrel plug into the board's barrel jack or VIN.",
      when: "Bench projects on a board with a barrel jack (Uno, Mega); must go to VIN / barrel jack, never a 5 V pin.",
    },
    synonyms: ["9vadapter", "9vsupply", "9vdc", "9vwalladapter", "9vpowersupply", "barrel9v", "9vbarrel", "9vacadapter"],
  }),
  defineBattery({
    id: "supply_barrel_12v",
    name: "12 V DC Wall Supply (barrel plug)",
    label: "12V DC supply",
    group: "dc-supply" as const,
    chemistry: "dc-supply" as const,
    cells: 0,
    nominal: 12,
    min: 11.4,
    max: 12.6,
    rechargeable: false,
    holder: "barrel-adapter" as const,
    caption: "12V DC supply — barrel plug to screw block",
    planName: "12V DC wall supply",
    description:
      "A regulated 12 V DC wall adapter with a round barrel plug (centre pin +, outer sleeve -, usually 5.5 x 2.1 mm). Plug it into a board's barrel jack, or use a barrel-to-screw-terminal adapter to reach VIN and GND. 12 V is the top of an Arduino's 7-12 V range, so a fresh adapter can sit slightly above it: the board's regulator gets hot, so 9 V is kinder. It is too high for any 5 V or 3.3 V pin. Good for motors, relays and LED strips that need 12 V.",
    photoCaption: "12 V DC wall supply with a barrel plug (centre +) and screw-terminal adapter.",
    identify:
      "A plastic brick with mains prongs and a cable ending in a round barrel plug. The label says OUTPUT DC 12V with a current such as 1 A or 2 A and a centre-positive symbol.",
    variants: [
      {
        label: "12 V regulated, 1-2 A (this guide)",
        detail: "Stable 12 V, enough for a board plus a 12 V motor or LED strip.",
        matchesGuide: true,
      },
      {
        label: "Unregulated 12 V",
        detail: "Cheap 'transformer' types can read 15-18 V with no load. Prefer a regulated supply.",
      },
    ],
    watchOuts: [
      "Only use a regulated adapter of the right voltage. Check the plug polarity (centre +): the opposite can destroy the board.",
      "12 V must not go to a 5 V or 3.3 V pin. A linear regulator on the board gets hot at 12 V; for a 5 V board consider a buck converter instead.",
      "Do not open or modify the adapter: it carries mains voltage inside.",
    ],
    pinNotes: { plus: "screw block", minus: "screw block" },
    choice: {
      label: "12V wall adapter (barrel plug)",
      fact: "a 12V wall adapter",
      hint: "Mains-powered. For boards with a barrel jack, 12 V motors or strips. Not for 5 V pins.",
    },
    ask: {
      label: "12V DC wall adapter (barrel jack)",
      diagram: "12 V brick with a barrel plug into the board's barrel jack or VIN.",
      when: "Bench projects with 12 V motors, relays or LED strips; VIN / barrel jack only, never a 5 V pin.",
    },
    synonyms: ["12vadapter", "12vsupply", "12vdc", "12vwalladapter", "12vpowersupply", "barrel12v", "12vbarrel", "12vacadapter", "12v"],
  }),
];

export type BatteryKind = (typeof BATTERY_RECORDS)[number]["id"];

/** Partial view of `BATTERY_RECORDS` for iteration. */
export const BATTERY_RECORD_LIST: readonly BatteryRecord[] = BATTERY_RECORDS;
