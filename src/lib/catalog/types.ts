import type { BatteryKind } from "./battery-records";

/**
 * Every power source a guide can name. The battery / supply ids are generated from
 * the table in battery-records.ts (add a record there, not here).
 */
export type PowerSource = "usb_wall" | "power_bank" | BatteryKind;

export type PinKind =
  | "digital"
  | "analog"
  | "power"
  | "ground"
  | "i2c"
  | "spi"
  | "uart";

export type LogicLevel = "3v3" | "5v";

export type VoltageRange = { min: number; max: number };

/**
 * Electrical behaviour of one power pin, in volts.
 * - `source`: the pin drives this voltage (regulator output, battery, USB).
 *   `external: true` marks a real supply part (battery / USB brick) as opposed
 *   to a board regulator output.
 * - `accepts`: voltage range the pin tolerates when something else drives it.
 *   A board regulator output with no `accepts` tolerates its own output range.
 */
export type PinElectrical = {
  source?: VoltageRange & { nominal: number; external?: boolean };
  accepts?: VoltageRange;
};

export type BatteryChemistry =
  | "alkaline"
  | "nimh"
  | "lithium"
  | "coin-lithium"
  | "li-ion"
  | "lipo"
  | "dc-supply";

/** Part-level electrical data. Optional: parts without it are not checked. */
export type PartElectrical = {
  /** Nominal I/O logic level. */
  logic?: LogicLevel;
  /** Module outputs swing to whatever supply voltage the module is wired to. */
  logicFollowsSupply?: boolean;
  /** Board only: GPIO survives 5V input. false for 3.3V-only MCUs. */
  fiveVTolerantIo?: boolean;
  /** Module only: allowed VCC range, applied to every power pin without a `pins` override. */
  supply?: VoltageRange;
  /** Per-pin overrides (board power pins, battery terminals, multi-supply modules). */
  pins?: Record<string, PinElectrical>;
  /** Module signal pins that only receive (never drive) a signal. */
  inputOnlyPins?: string[];
  /** Module signal inputs tolerate at most this voltage. */
  inputMaxVolts?: number;
  /** When false, exceeding inputMaxVolts is a warning instead of an error. Default true. */
  inputMaxIsHard?: boolean;
  /** HIGH threshold as a fraction of the module supply (e.g. 0.7 * VDD). */
  inputHighFraction?: number;
  /** Absolute HIGH threshold in volts. */
  inputHighVolts?: number;
  /** Power parts only. */
  battery?: {
    chemistry: BatteryChemistry;
    cells: number;
    /** Can only supply a few milliamps (coin cells). */
    lowCurrent?: boolean;
  };
};

export type CatalogPin = {
  id: string;
  label: string;
  kinds: PinKind[];
  voltage?: "3v3" | "5v";
};

export type WokwiPart = {
  tag: string;
  attrs?: Record<string, string>;
};

export type PartVariantNote = {
  label: string;
  detail: string;
  matchesGuide?: boolean;
};

export type PartCategory =
  | "Board"
  | "Sensor"
  | "Display"
  | "Output"
  | "Input"
  | "Power"
  | "Basic part";

/** Photo search phrases for one part: bare list (Commons/Openverse) or per-source. */
export type PhotoQueriesOverride =
  | string[]
  | { commons: string[]; wikipedia?: string[]; openverse?: string[] };

export type CatalogPart = {
  id: string;
  name: string;
  kind: "board" | "module" | "passive";
  description: string;
  pins: CatalogPin[];
  photoHint?: string;
  photoCaption?: string;
  identify?: string;
  variants?: PartVariantNote[];
  watchOuts?: string[];
  wokwi?: WokwiPart;
  electrical?: PartElectrical;
  /** Explicit category; when set it wins over the id/name heuristics. */
  category?: PartCategory;
  /** Retired part: still resolvable by id, hidden from lists and pickers. */
  deprecated?: true;
  /** Catalog id to prefer instead of a deprecated part. */
  replacedBy?: string;
  displayClass?:
    | "character-lcd"
    | "oled"
    | "tft"
    | "epaper"
    | "matrix";
};

/** One catalog part plus its optional photo search phrases (the DB `published` shape). */
export type PartRecord = { part: CatalogPart; photoQueries?: PhotoQueriesOverride };

export type Recipe = {
  id: string;
  name: string;
  summary: string;
  boardIds: string[];
  moduleIds: string[];
};

export type GuidePart = {
  instanceId: string;
  catalogId: string;
  label?: string;
};

export type GuideConnection = {
  id: string;
  from: { instanceId: string; pinId: string };
  to: { instanceId: string; pinId: string };
  note?: string;
};

export type GuideStep = {
  id: string;
  title: string;
  body: string;
  order: number;
};

export type Guide = {
  id: string;
  title: string;
  power_source: PowerSource | null;
  board_id: string | null;
  parts: GuidePart[];
  connections: GuideConnection[];
  steps: GuideStep[];
  notes: string[];
  created_at: string;
  updated_at: string;
  /** Last time the guide was opened or updated; drives automatic cleanup. */
  last_accessed_at?: string | null;
};

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  code: string;
  /** Omitted means "error" (legacy issues). Warnings never block `ok`. */
  severity?: ValidationSeverity;
  message: string;
  alternatives: string[];
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  needsPowerSource: boolean;
};
