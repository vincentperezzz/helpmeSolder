import type { PartCategory } from "./part-media";

/**
 * Wikimedia Commons lookup for real reference photos.
 *
 * Commons images are openly licensed and the API is free to use with a
 * descriptive User-Agent. Everything here is pure (or takes an injected
 * fetch) so it can be unit tested without the network.
 */

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
export const COMMONS_USER_AGENT =
  "HelpmeSolder/1.0 (https://helpmesolder.vercel.app)";

/** Seven days, in seconds. */
export const COMMONS_REVALIDATE_SECONDS = 604800;

/** Bucket for the part-photos route: 60 requests per hour per client. */
export const PART_PHOTOS_LIMIT = {
  bucket: "part-photos",
  limit: 60,
  windowMs: 60 * 60_000,
} as const;

export const MAX_COMMONS_IMAGES = 3;
const SEARCH_LIMIT = 8;
const FETCH_TIMEOUT_MS = 6000;
const MAX_AUTHOR_LENGTH = 80;
/** Share of the part name's identifying words a title must contain. */
const MIN_SCORE = 0.5;

export type CommonsImage = {
  thumb: string;
  pageUrl: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string | null;
};

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Words in a file title that point at a drawing, not a photo of the part. */
const NOT_A_PHOTO =
  /\b(diagram|schematic|logo|pinout|screenshot|icon|flowchart|chart|graph|wiring|drawing|vector|footprint|datasheet)\b/i;

/** Words that carry no identifying power when matching a title. */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "with",
  "and",
  "for",
  "of",
  "module",
  "board",
  "sensor",
  "snap",
  "half",
]);

/** Query words are plain letters and digits, so search syntax cannot leak in. */
function cleanName(name: string): string {
  return name
    .replace(/×/g, "x")
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Search text for a part: its catalog name, plus a noun that steers results. */
export function buildCommonsQuery(name: string, category: PartCategory): string {
  const base = cleanName(name);
  if (!base) return "";
  if (category === "Board") return `${base} board`;
  if (category === "Basic part" || category === "Power") return base;
  return `${base} module`;
}

export function buildCommonsUrl(query: string): string {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(SEARCH_LIMIT),
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "480",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|ObjectName",
    format: "json",
  });
  return `${COMMONS_API}?${params.toString()}`;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Remove tags and decode the few entities Commons uses in metadata. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const num =
          code[1] === "x" || code[1] === "X"
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);
        return Number.isFinite(num) && num > 0 && num < 0x110000
          ? String.fromCodePoint(num)
          : " ";
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** "File:Arduino Uno R3 front.jpg" becomes "Arduino Uno R3 front". */
export function fileTitle(raw: string): string {
  return raw.replace(/^file:/i, "").replace(/\.[a-z0-9]{2,5}$/i, "").trim();
}

/**
 * How well a file title matches the part name, from 0 to 1.
 * Only identifying words count (not "module", "board" and the like).
 */
export function scoreTitle(title: string, partName: string): number {
  const wanted = tokens(cleanName(partName)).filter((t) => !STOP_WORDS.has(t));
  if (wanted.length === 0) return 0;
  const found = new Set(tokens(fileTitle(title)));
  const compact = tokens(fileTitle(title)).join("");
  let hits = 0;
  for (const word of wanted) {
    if (found.has(word) || (word.length >= 3 && compact.includes(word))) hits += 1;
  }
  return hits / wanted.length;
}

/** A model number such as "esp32" or "sr04": letters mixed with digits. */
function modelTokens(partName: string): string[] {
  return tokens(cleanName(partName)).filter((t) => /\d/.test(t) && /[a-z]/.test(t));
}

function isHttpsOn(url: unknown, host: string): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === host;
  } catch {
    return false;
  }
}

function metaValue(meta: unknown, key: string): string {
  if (!meta || typeof meta !== "object") return "";
  const entry = (meta as Record<string, unknown>)[key];
  if (!entry || typeof entry !== "object") return "";
  const value = (entry as { value?: unknown }).value;
  return typeof value === "string" ? value : "";
}

function safeLicenseUrl(raw: string): string | null {
  const url = stripHtml(raw);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`;
}

type Candidate = { image: CommonsImage; score: number; rank: number };

function toCandidate(page: unknown, partName: string): Candidate | null {
  if (!page || typeof page !== "object") return null;
  const record = page as {
    title?: unknown;
    index?: unknown;
    imageinfo?: unknown;
  };
  if (typeof record.title !== "string") return null;
  const info = Array.isArray(record.imageinfo) ? record.imageinfo[0] : null;
  if (!info || typeof info !== "object") return null;
  const { thumburl, descriptionurl, mime, extmetadata } = info as {
    thumburl?: unknown;
    descriptionurl?: unknown;
    mime?: unknown;
    extmetadata?: unknown;
  };

  if (typeof mime !== "string" || !ALLOWED_MIME.has(mime)) return null;
  if (!isHttpsOn(thumburl, "upload.wikimedia.org")) return null;
  if (!isHttpsOn(descriptionurl, "commons.wikimedia.org")) return null;

  const license = stripHtml(metaValue(extmetadata, "LicenseShortName"));
  if (!license) return null;

  const title = fileTitle(record.title);
  const nameTokens = new Set(tokens(partName));
  const rejected = title.match(NOT_A_PHOTO);
  if (rejected && !nameTokens.has(rejected[0].toLowerCase())) return null;

  const score = scoreTitle(title, partName);
  // A model number ("esp32", "dht22") is the strongest signal: when the part
  // has one, the title must carry it and nothing else is required. Otherwise
  // enough of the name's words must match.
  const models = modelTokens(partName);
  if (models.length > 0) {
    const compact = tokens(title).join("");
    if (!models.some((m) => compact.includes(m))) return null;
  } else if (score < MIN_SCORE) {
    return null;
  }

  const author =
    clip(stripHtml(metaValue(extmetadata, "Artist")), MAX_AUTHOR_LENGTH) ||
    "Unknown author";

  return {
    image: {
      thumb: thumburl,
      pageUrl: descriptionurl,
      title,
      author,
      license,
      licenseUrl: safeLicenseUrl(metaValue(extmetadata, "LicenseUrl")),
    },
    score,
    rank: typeof record.index === "number" ? record.index : 1000,
  };
}

/** Turn a raw Commons API response into at most `max` safe, relevant images. */
export function shapeCommonsResponse(
  json: unknown,
  partName: string,
  max: number = MAX_COMMONS_IMAGES,
): CommonsImage[] {
  if (!json || typeof json !== "object") return [];
  const query = (json as { query?: unknown }).query;
  if (!query || typeof query !== "object") return [];
  const pages = (query as { pages?: unknown }).pages;
  const list: unknown[] = Array.isArray(pages)
    ? pages
    : pages && typeof pages === "object"
      ? Object.values(pages)
      : [];

  return list
    .map((page) => toCandidate(page, partName))
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .slice(0, max)
    .map((c) => c.image);
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Look up photos for a part. Never throws: any failure gives an empty list.
 * `ok` is false when the upstream call failed, so callers can cache less.
 */
export async function fetchCommonsImages(
  partName: string,
  category: PartCategory,
  fetchImpl: FetchLike = fetch,
): Promise<{ images: CommonsImage[]; ok: boolean }> {
  const query = buildCommonsQuery(partName, category);
  if (!query) return { images: [], ok: true };
  try {
    const response = await fetchImpl(buildCommonsUrl(query), {
      headers: {
        "User-Agent": COMMONS_USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: COMMONS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { images: [], ok: false };
    const json: unknown = await response.json();
    return { images: shapeCommonsResponse(json, partName), ok: true };
  } catch {
    return { images: [], ok: false };
  }
}
