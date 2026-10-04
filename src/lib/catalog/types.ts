export type PowerSource =
  | "usb_wall"
  | "battery_9v"
  | "battery_2aa"
  | "battery_3aa"
  | "battery_18650";

export type PinKind =
  | "digital"
  | "analog"
  | "power"
  | "ground"
  | "i2c"
  | "spi"
  | "uart";

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

export type CatalogPart = {
  id: string;
  name: string;
  kind: "board" | "module" | "passive";
  description: string;
  pins: CatalogPin[];
  photoHint?: string;
  wokwi?: WokwiPart;
  displayClass?:
    | "character-lcd"
    | "oled"
    | "tft"
    | "epaper"
    | "matrix";
};

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
};

export type ValidationIssue = {
  code: string;
  message: string;
  alternatives: string[];
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  needsPowerSource: boolean;
};
