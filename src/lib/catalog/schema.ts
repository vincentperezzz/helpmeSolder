/**
 * Validation for catalog records that live in the database (parts, recipes, media).
 *
 * Everything here is pure, so the same code runs in the admin editor, the
 * import dry run, the publish checks (checks.ts) and the tests that prove the
 * bundled seed is valid. Messages are written for a person editing the catalog,
 * not for a developer.
 */
import { z } from "zod";
import { isAllowedLicense } from "./photo-shared";
import type {
  CatalogPart,
  PartCategory,
  PartRecord,
  PhotoQueriesOverride,
  Recipe,
} from "./types";
import { WOKWI_TAGS } from "./wokwi-tags.generated";

/* ------------------------------ constants ------------------------------ */

export type PartKind = CatalogPart["kind"];

/** `board.arduino.uno`, `module.dht22`, `passive.resistor.1k`. Ids are never reused or renamed. */
export const ID_PATTERN = /^(board|module|passive)\.[a-z0-9][a-z0-9._-]{0,61}$/;
export const RECIPE_ID_PATTERN = /^recipe\.[a-z0-9][a-z0-9._-]{0,61}$/;
// "/" is allowed on top of the planned set because the seed has the ILI9341 pin "D/C".
export const PIN_ID_PATTERN = /^[A-Za-z0-9.+_/-]{1,24}$/;
export const PHOTO_HINT_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const WOKWI_ATTR_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;

export const PIN_KINDS = ["digital", "analog", "power", "ground", "i2c", "spi", "uart"] as const;
export const PART_CATEGORIES = [
  "Board",
  "Sensor",
  "Display",
  "Output",
  "Input",
  "Power",
  "Basic part",
] as const satisfies readonly PartCategory[];
export const DISPLAY_CLASSES = ["character-lcd", "oled", "tft", "epaper", "matrix"] as const;
export const BATTERY_CHEMISTRIES = [
  "alkaline",
  "nimh",
  "lithium",
  "coin-lithium",
  "li-ion",
  "lipo",
  "dc-supply",
] as const;
export const MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

/** Largest voltage any catalog value may name. */
export const MAX_VOLTS = 48;
/** Largest stored record (parts and recipes), in bytes of JSON. */
export const MAX_RECORD_BYTES = 256 * 1024;
export const MEDIA_MIN_BYTES = 500;
export const MEDIA_MAX_BYTES = 1024 * 1024;

/**
 * Text limits in characters. Where the bundled seed already needed more room than
 * the planned limit, the limit was widened to fit the seed and noted here.
 */
export const TEXT_LIMITS = {
  name: { min: 2, max: 80 },
  description: { min: 40, max: 1200 },
  identify: { max: 800 },
  photoCaption: { max: 240 },
  watchOuts: { maxItems: 12, min: 10, max: 600 },
  variants: { maxItems: 8, label: 80, detail: 400 },
  pins: { min: 1, max: 160 },
  pinLabel: { min: 1, max: 32 },
  wokwiAttrs: { max: 12, valueMax: 200 },
  photoPhrase: { min: 2, max: 80 },
  photoPhrases: { commons: 4, wikipedia: 4, openverse: 4 },
  recipeName: { min: 2, max: 80 },
  recipeSummary: { min: 10, max: 300 },
  recipeIds: { maxItems: 20 },
  mediaText: { max: 200 },
} as const;

/* ------------------------------ issues ------------------------------ */

export type Issue = {
  code: string;
  /** Dotted path of the field the message is about, when there is one. */
  field?: string;
  message: string;
};

/* ------------------------------ text cleaning ------------------------------ */

// Control characters except \n (and \t, which becomes a space).
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;
// Zero-width and invisible formatting characters, including soft hyphen and BOM.
const ZERO_WIDTH = /[­​-‏⁠-⁤﻿]/g;
// Bidirectional overrides and isolates (used to disguise text).
const BIDI = /[؜‪-‮⁦-⁩]/g;
const HTML_LIKE = /<\s*[a-zA-Z!/]/;
const JS_URL = /j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i;

/**
 * Clean text typed or pasted into the catalog: Unicode NFC, control, zero-width
 * and bidi characters removed (newlines stay), runs of spaces collapsed, each
 * line and the whole text trimmed.
 */
export function sanitizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(CONTROL, "")
    .replace(ZERO_WIDTH, "")
    .replace(BIDI, "")
    .replace(/[  ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Why a text must be rejected (not just cleaned), or null when it is fine. */
export function textProblem(input: string): string | null {
  if (HTML_LIKE.test(input)) return "can't contain HTML tags (anything that starts with <)";
  if (JS_URL.test(input)) return "can't contain javascript: links";
  return null;
}

/* ------------------------------ building blocks ------------------------------ */

function cleanText(): z.ZodPipe<z.ZodString, z.ZodTransform<string, string>> {
  return z.string().transform((value, ctx) => {
    const text = sanitizeText(value);
    const problem = textProblem(value) ?? textProblem(text);
    if (problem) {
      ctx.issues.push({ code: "custom", message: `This text ${problem}.`, input: value });
      return z.NEVER;
    }
    return text;
  });
}

/** Cleaned text with a length range (checked after cleaning). */
function text(min: number, max: number) {
  return cleanText().pipe(z.string().min(min).max(max));
}

const pinId = z
  .string()
  .refine((v) => PIN_ID_PATTERN.test(v), {
    message:
      "Pin ids use only letters, numbers and . + - _ / (1 to 24 characters), for example GP15 or 3V3.",
  });

const pinKind = z.enum(PIN_KINDS);

const volts = z.number().min(0).max(MAX_VOLTS);

const voltageRange = z
  .strictObject({ min: volts, max: volts })
  .refine((r) => r.min <= r.max, { message: "The lowest voltage can't be above the highest." });

const pinElectrical = z.strictObject({
  source: z
    .strictObject({
      min: volts,
      max: volts,
      nominal: volts,
      external: z.boolean().optional(),
    })
    .refine((s) => s.min <= s.nominal && s.nominal <= s.max, {
      message: "A supply voltage must satisfy lowest <= normal <= highest.",
    })
    .optional(),
  accepts: voltageRange.optional(),
});

const partElectrical = z.strictObject({
  logic: z.enum(["3v3", "5v"]).optional(),
  logicFollowsSupply: z.boolean().optional(),
  fiveVTolerantIo: z.boolean().optional(),
  supply: voltageRange.optional(),
  pins: z.record(z.string(), pinElectrical).optional(),
  inputOnlyPins: z.array(pinId).max(TEXT_LIMITS.pins.max).optional(),
  inputMaxVolts: volts.optional(),
  inputMaxIsHard: z.boolean().optional(),
  inputHighFraction: z.number().min(0).max(1).optional(),
  inputHighVolts: volts.optional(),
  battery: z
    .strictObject({
      chemistry: z.enum(BATTERY_CHEMISTRIES),
      cells: z.number().int().min(1).max(24),
      lowCurrent: z.boolean().optional(),
    })
    .optional(),
});

const pin = z
  .strictObject({
    id: pinId,
    label: text(TEXT_LIMITS.pinLabel.min, TEXT_LIMITS.pinLabel.max),
    kinds: z.array(pinKind).min(1).max(PIN_KINDS.length),
    voltage: z.enum(["3v3", "5v"]).optional(),
  })
  .refine((p) => new Set(p.kinds).size === p.kinds.length, {
    message: "A pin lists the same kind twice.",
    path: ["kinds"],
  });

const wokwi = z.strictObject({
  tag: z.string().refine((tag) => WOKWI_TAGS.has(tag), {
    message:
      "That Wokwi element name doesn't exist. Use a name from the @wokwi/elements package, such as wokwi-led.",
  }),
  attrs: z
    .record(
      z.string().refine((k) => WOKWI_ATTR_KEY_PATTERN.test(k), {
        message: "Wokwi setting names use letters, numbers, - and _ only.",
      }),
      z.string().max(TEXT_LIMITS.wokwiAttrs.valueMax),
    )
    .refine((a) => Object.keys(a).length <= TEXT_LIMITS.wokwiAttrs.max, {
      message: `A Wokwi drawing can have at most ${TEXT_LIMITS.wokwiAttrs.max} settings.`,
    })
    .optional(),
});

const variant = z.strictObject({
  label: text(1, TEXT_LIMITS.variants.label),
  detail: text(1, TEXT_LIMITS.variants.detail),
  matchesGuide: z.boolean().optional(),
});

/* ------------------------------ part schema ------------------------------ */

export type PartSchemaOptions = {
  /**
   * Allow more than the usual 160 pins. For parts whose bundled pin list is
   * longer (the breadboard) and whose pins are locked, so nobody edits them.
   */
  lockedPins?: boolean;
};

const LOCKED_PIN_CEILING = 2000;

function pathOf(...p: (string | number)[]) {
  return p;
}

/** Cross-field rules for one part (prefix, unique pin ids, electrical references). */
function crossChecks(part: CatalogPart, ctx: z.RefinementCtx): void {
  if (!part.id.startsWith(`${part.kind}.`)) {
    ctx.addIssue({
      code: "custom",
      path: pathOf("id"),
      message: `The id must start with "${part.kind}." for a ${part.kind}.`,
    });
  }
  const ids = new Set<string>();
  part.pins.forEach((p, i) => {
    if (ids.has(p.id)) {
      ctx.addIssue({
        code: "custom",
        path: pathOf("pins", i, "id"),
        params: { code: "duplicate_pin_ids" },
        message: `Two pins share the id "${p.id}". Every pin id must be different.`,
      });
    }
    ids.add(p.id);
  });
  for (const key of Object.keys(part.electrical?.pins ?? {})) {
    if (!ids.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: pathOf("electrical", "pins", key),
        params: { code: "bad_electrical_reference" },
        message: `The electrical data names a pin "${key}" that this part doesn't have.`,
      });
    }
  }
  (part.electrical?.inputOnlyPins ?? []).forEach((key, i) => {
    if (!ids.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: pathOf("electrical", "inputOnlyPins", i),
        params: { code: "bad_electrical_reference" },
        message: `"Input only" lists a pin "${key}" that this part doesn't have.`,
      });
    }
  });
  if (part.replacedBy !== undefined && part.replacedBy === part.id) {
    ctx.addIssue({
      code: "custom",
      path: pathOf("replacedBy"),
      message: "A part can't be replaced by itself.",
    });
  }
}

/** Build the part schema. The default export `CatalogPartSchema` uses no options. */
export function catalogPartSchema(options: PartSchemaOptions = {}) {
  const maxPins = options.lockedPins ? LOCKED_PIN_CEILING : TEXT_LIMITS.pins.max;
  const shape = z
    .strictObject({
      id: z.string().refine((v) => ID_PATTERN.test(v), {
        message:
          'Ids look like "module.dht22": board, module or passive, a dot, then lowercase letters, numbers and . _ - (up to 62 characters).',
      }),
      name: text(TEXT_LIMITS.name.min, TEXT_LIMITS.name.max),
      kind: z.enum(["board", "module", "passive"]),
      description: text(TEXT_LIMITS.description.min, TEXT_LIMITS.description.max),
      pins: z.array(pin).min(TEXT_LIMITS.pins.min).max(maxPins),
      photoHint: z
        .string()
        .refine((v) => PHOTO_HINT_PATTERN.test(v), {
          message:
            "The photo name uses lowercase letters, numbers and - only, for example dht22 or led-red.",
        })
        .optional(),
      photoCaption: text(0, TEXT_LIMITS.photoCaption.max).optional(),
      identify: text(0, TEXT_LIMITS.identify.max).optional(),
      variants: z.array(variant).max(TEXT_LIMITS.variants.maxItems).optional(),
      watchOuts: z
        .array(text(TEXT_LIMITS.watchOuts.min, TEXT_LIMITS.watchOuts.max))
        .max(TEXT_LIMITS.watchOuts.maxItems)
        .optional(),
      wokwi: wokwi.optional(),
      electrical: partElectrical.optional(),
      category: z.enum(PART_CATEGORIES).optional(),
      deprecated: z.literal(true).optional(),
      replacedBy: z
        .string()
        .refine((v) => ID_PATTERN.test(v), { message: "The replacement part id isn't a valid id." })
        .optional(),
      displayClass: z.enum(DISPLAY_CLASSES).optional(),
    })
    .superRefine((part, ctx) => crossChecks(part as CatalogPart, ctx));
  return shape satisfies z.ZodType<CatalogPart>;
}

export const CatalogPartSchema = catalogPartSchema();

/* ------------------------------ photo phrases ------------------------------ */

const PHRASE_CHARS = /^[\p{L}\p{N} +\-.,×/'&()]+$/u;

const phrase = text(TEXT_LIMITS.photoPhrase.min, TEXT_LIMITS.photoPhrase.max).refine(
  (v) => PHRASE_CHARS.test(v),
  { message: "Photo search phrases use letters, numbers, spaces and + - . , / ' & ( ) only." },
);

const phraseList = (max: number) => z.array(phrase).max(max);

export const PhotoQueriesSchema = z.union([
  phraseList(TEXT_LIMITS.photoPhrases.commons).min(1),
  z.strictObject({
    commons: phraseList(TEXT_LIMITS.photoPhrases.commons).min(1),
    wikipedia: phraseList(TEXT_LIMITS.photoPhrases.wikipedia).optional(),
    openverse: phraseList(TEXT_LIMITS.photoPhrases.openverse).optional(),
  }),
]) satisfies z.ZodType<PhotoQueriesOverride>;

/* ------------------------------ record schema ------------------------------ */

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function partRecordSchema(options: PartSchemaOptions = {}) {
  return z
    .strictObject({
      part: catalogPartSchema(options),
      photoQueries: PhotoQueriesSchema.optional(),
    })
    .refine((record) => jsonBytes(record) <= MAX_RECORD_BYTES, {
      message: "This part's data is too large to store (over 256 KB).",
    }) satisfies z.ZodType<PartRecord>;
}

export const PartRecordSchema = partRecordSchema();

/* ------------------------------ media ------------------------------ */

const SUPABASE_PUBLIC_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[A-Za-z0-9._\-/]+$/;
const LOCAL_URL = /^\/(photos|assets)\/[A-Za-z0-9._\-/]+$/;

export function isAllowedMediaUrl(url: string): boolean {
  if (url.includes("..") || url.includes("\\")) return false;
  return LOCAL_URL.test(url) || SUPABASE_PUBLIC_URL.test(url);
}

export const MediaSchema = z.strictObject({
  photo_hint: z.string().refine((v) => PHOTO_HINT_PATTERN.test(v), {
    message: "The photo name uses lowercase letters, numbers and - only.",
  }),
  url: z.string().refine(isAllowedMediaUrl, {
    message:
      "The image address must start with /photos/ or /assets/, or be a public file in the Supabase storage bucket.",
  }),
  mime: z.enum(MEDIA_MIME_TYPES),
  bytes: z.number().int().min(MEDIA_MIN_BYTES).max(MEDIA_MAX_BYTES),
  width: z.number().int().min(1).max(10000).optional(),
  height: z.number().int().min(1).max(10000).optional(),
  sha256: z
    .string()
    .refine((v) => /^[0-9a-f]{64}$/.test(v), { message: "The file fingerprint must be 64 hex characters." })
    .optional(),
  license: text(1, TEXT_LIMITS.mediaText.max).refine(isAllowedLicense, {
    message:
      "Every image needs a free licence (CC0, public domain, CC BY or CC BY-SA). Non-commercial and no-derivatives licences are not allowed.",
  }),
  author: text(0, TEXT_LIMITS.mediaText.max).optional(),
  source_url: z
    .string()
    .refine((v) => /^https:\/\/[^\s]+$/.test(v) && v.length <= 500, {
      message: "The source link must be a web address starting with https://.",
    })
    .optional(),
});

export type MediaRecord = z.infer<typeof MediaSchema>;

/* ------------------------------ recipes ------------------------------ */

export const RecipeSchema = z
  .strictObject({
    id: z.string().refine((v) => RECIPE_ID_PATTERN.test(v), {
      message: 'Recipe ids look like "recipe.buzzer": lowercase letters, numbers and . _ -.',
    }),
    name: text(TEXT_LIMITS.recipeName.min, TEXT_LIMITS.recipeName.max),
    summary: text(TEXT_LIMITS.recipeSummary.min, TEXT_LIMITS.recipeSummary.max),
    boardIds: z
      .array(z.string().refine((v) => ID_PATTERN.test(v) && v.startsWith("board."), "Not a board id."))
      .max(TEXT_LIMITS.recipeIds.maxItems),
    moduleIds: z
      .array(z.string().refine((v) => ID_PATTERN.test(v), "Not a part id."))
      .max(TEXT_LIMITS.recipeIds.maxItems),
  })
  .refine((r) => jsonBytes(r) <= MAX_RECORD_BYTES, {
    message: "This recipe is too large to store (over 256 KB).",
  }) satisfies z.ZodType<Recipe>;

/* ------------------------------ messages ------------------------------ */

const FIELD_NAMES: Record<string, string> = {
  id: "id",
  name: "name",
  kind: "type",
  description: "description",
  identify: '"How to identify" text',
  photoHint: "photo name",
  photoCaption: "photo caption",
  watchOuts: "watch-out",
  variants: "variant",
  pins: "pin",
  label: "label",
  detail: "detail",
  kinds: "kinds",
  voltage: "voltage",
  wokwi: "Wokwi drawing",
  tag: "element name",
  attrs: "settings",
  electrical: "electrical data",
  category: "category",
  replacedBy: "replacement",
  displayClass: "display type",
  summary: "summary",
  boardIds: "boards",
  moduleIds: "parts",
  commons: "Commons phrase",
  wikipedia: "Wikipedia title",
  openverse: "Openverse phrase",
  photoQueries: "photo search phrases",
  photo_hint: "photo name",
  url: "image address",
  mime: "file type",
  bytes: "file size",
  license: "licence",
  author: "author",
  source_url: "source link",
};

/** "pins.3.label" -> "Pin 4 label". */
export function describePath(fullPath: readonly PropertyKey[]): string {
  // Records wrap the part: "part.pins.0.id" reads as "Pin 1 id".
  const path = fullPath[0] === "part" ? fullPath.slice(1) : fullPath;
  const parts: string[] = [];
  for (let i = 0; i < path.length; i += 1) {
    const key = path[i];
    const next = path[i + 1];
    const name = typeof key === "string" ? (FIELD_NAMES[key] ?? key) : String(key);
    if (typeof key === "string" && typeof next === "number") {
      parts.push(`${name} ${next + 1}`);
      i += 1;
    } else if (typeof key === "number") {
      parts.push(String(key + 1));
    } else {
      parts.push(name);
    }
  }
  const text = parts.join(" ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "This record";
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function sizeWord(origin: string, n: number): string {
  if (origin === "string") return plural(n, "character");
  if (origin === "array" || origin === "set") return plural(n, "item");
  return String(n);
}

function messageFor(issue: z.core.$ZodIssue): string {
  const who = describePath(issue.path);
  switch (issue.code) {
    case "too_small": {
      const o = issue.origin;
      if (o === "number" || o === "int") return `${who} must be at least ${String(issue.minimum)}.`;
      return `${who} needs at least ${sizeWord(o, Number(issue.minimum))}.`;
    }
    case "too_big": {
      const o = issue.origin;
      if (o === "number" || o === "int") return `${who} can be at most ${String(issue.maximum)}.`;
      return `${who} can have at most ${sizeWord(o, Number(issue.maximum))}.`;
    }
    case "invalid_value":
      return `${who} must be one of: ${issue.values.map(String).join(", ")}.`;
    case "unrecognized_keys":
      return `${who} has fields that aren't allowed here: ${issue.keys.join(", ")}.`;
    case "invalid_type":
      return `${who} is missing or the wrong kind of value (expected ${issue.expected}).`;
    case "invalid_format":
      return `${who} isn't in the expected format.`;
    case "not_multiple_of":
      return `${who} isn't a whole step of ${String(issue.divisor)}.`;
    case "custom":
      return issue.message ?? `${who} isn't valid.`;
    default:
      return `${who} isn't valid.`;
  }
}

/** Turn a zod error into plain-English issues a person can act on. */
export function formatZodIssues(error: z.ZodError): Issue[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join(".") : undefined;
    const base = messageFor(issue);
    // Custom messages describe the rule; say where it was broken.
    const message =
      issue.code === "custom" && issue.path.length > 0 && !base.startsWith(describePath(issue.path))
        ? `${describePath(issue.path)}: ${base}`
        : base;
    const params = issue.code === "custom" ? (issue.params as { code?: unknown } | undefined) : undefined;
    const code = typeof params?.code === "string" ? params.code : "schema";
    return { code, ...(field ? { field } : {}), message };
  });
}
