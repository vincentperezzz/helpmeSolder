/**
 * Pieces shared by every outside-photo source (Commons, Wikipedia, Openverse):
 * the common result shape, licence and host allow-lists, text cleaning and
 * title relevance. All pure, so they can be unit tested without the network.
 */

export const PHOTO_USER_AGENT =
  "HelpmeSolder/1.0 (+https://helpmesolder.vercel.app)";

export type PhotoSource = "commons" | "wikipedia" | "openverse";

/** One outside photo, with the attribution needed to show it. */
export type PartPhoto = {
  /** Larger image, same host rules as the thumbnail. */
  url: string;
  thumbUrl: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  /** Page a person can open to see the file and its licence. */
  sourceUrl: string;
  source: PhotoSource;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Result of one source: `ok` is false when the upstream call itself failed. */
export type SourceResult = { images: PartPhoto[]; ok: boolean };

export const SOURCE_TIMEOUT_MS = 4000;
const MAX_AUTHOR_LENGTH = 80;

/** Hosts an image URL may point at. */
const IMAGE_HOSTS = new Set([
  "upload.wikimedia.org",
  "thumb.wikimedia.org",
  "api.openverse.org",
]);

export function isImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isHttpsOn(url: unknown, host: string): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === host;
  } catch {
    return false;
  }
}

/** Any https page we may link to (landing pages are links, never loaded). */
export function isHttpsUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/* ------------------------------ licences ------------------------------ */

const NON_FREE = /(^|[\s-])(nc|nd)(?![a-z])/i;
const FREE =
  /^(cc0|cc[\s-]?zero|public domain|pdm|pd[\s-]|pd$|no restrictions|cc[\s-]by(?![a-z]))/i;

/**
 * Free to reuse with credit: CC0, public domain, CC BY, CC BY-SA and
 * equivalents. Anything non-commercial or no-derivatives is rejected.
 */
export function isAllowedLicense(short: string): boolean {
  const text = short.trim();
  if (!text) return false;
  if (NON_FREE.test(text)) return false;
  return FREE.test(text);
}

/* ------------------------------ text ------------------------------ */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Remove tags and decode the few entities these APIs use in metadata. */
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

export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`;
}

export function cleanAuthor(raw: unknown): string {
  const text = typeof raw === "string" ? clip(stripHtml(raw), MAX_AUTHOR_LENGTH) : "";
  return text || "Unknown author";
}

/** Query words are plain letters and digits, so search syntax cannot leak in. */
export function cleanName(name: string): string {
  return name
    .replace(/×/g, "x")
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** "File:Arduino Uno R3 front.jpg" becomes "Arduino Uno R3 front". */
export function fileTitle(raw: string): string {
  return raw.replace(/^file:/i, "").replace(/\.[a-z0-9]{2,5}$/i, "").trim();
}

/** Words in a title that point at a drawing, not a photo of the part. */
const NOT_A_PHOTO =
  /\b(diagram|schematic|logo|pinout|screenshot|icon|flowchart|chart|graph|wiring|drawing|vector|footprint|datasheet|symbol|schema|section|cutaway)\b/i;

/** True when a file title names a drawing the query did not ask for. */
export function looksLikeDrawing(title: string, query: string = ""): boolean {
  const hit = fileTitle(title).match(NOT_A_PHOTO);
  return hit !== null && !tokens(query).includes(hit[0].toLowerCase());
}

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
  "breakout",
]);

/** Share of the wanted text's identifying words that a title contains, 0 to 1. */
export function scoreTitle(title: string, wanted: string): number {
  const words = tokens(cleanName(wanted)).filter((t) => !STOP_WORDS.has(t));
  if (words.length === 0) return 0;
  const parts = tokens(fileTitle(title));
  const found = new Set(parts);
  const compact = parts.join("");
  let hits = 0;
  for (const word of words) {
    if (found.has(word) || (word.length >= 3 && compact.includes(word))) hits += 1;
  }
  return hits / words.length;
}

/**
 * Model numbers in a query: letters mixed with digits ("esp32", "dht22"),
 * and hyphenated ones joined up ("KY-038" becomes "ky038").
 */
export function modelTokens(text: string): string[] {
  const plain = tokens(cleanName(text)).filter(
    (t) => t.length >= 4 && /\d/.test(t) && /[a-z]/.test(t),
  );
  const hyphenated = [...text.toLowerCase().matchAll(/([a-z]{1,4})-(\d{2,})/g)].map(
    (m) => `${m[1]}${m[2]}`,
  );
  return [...new Set([...plain, ...hyphenated])];
}

/**
 * A query may exclude words with a leading minus, as Commons search does:
 * "tactile switch -keyboard". `include` is the text to match titles against.
 */
export function splitQuery(query: string): { include: string; exclude: string[] } {
  const exclude: string[] = [];
  const include = query
    .replace(/(^|\s)-([\p{L}\p{N}]+)/gu, (_m, _sp: string, word: string) => {
      exclude.push(word.toLowerCase());
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { include, exclude };
}

/**
 * Does a result title plausibly show the thing the query asked for?
 * A model number in the query ("dht22") must appear and is enough; otherwise
 * most of the query's identifying words must appear, and any plain number in
 * the query ("3", "1602") must appear exactly. Drawing words in the title
 * ("pinout", "logo") reject it unless the query asked for them, and so do
 * words the query excludes with a minus.
 */
export function titleMatches(title: string, rawQuery: string): boolean {
  const { include: query, exclude } = splitQuery(rawQuery);
  const name = fileTitle(title);
  const parts = tokens(name);
  if (looksLikeDrawing(name, query)) return false;
  if (exclude.some((word) => parts.includes(word))) return false;

  const compact = parts.join("");
  const models = modelTokens(query);
  if (models.length > 0) return models.some((m) => compact.includes(m));

  const wanted = tokens(cleanName(query)).filter((t) => !STOP_WORDS.has(t));
  for (const number of wanted.filter((t) => /^\d+$/.test(t))) {
    const present = number.length === 1 ? parts.includes(number) : compact.includes(number);
    if (!present) return false;
  }
  const score = scoreTitle(name, query);
  return wanted.length <= 2 ? score === 1 : score >= 0.6;
}

/* ------------------------------ network ------------------------------ */

export async function getJson(
  url: string,
  fetchImpl: FetchLike,
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { "User-Agent": PHOTO_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function metaValue(meta: unknown, key: string): string {
  if (!meta || typeof meta !== "object") return "";
  const entry = (meta as Record<string, unknown>)[key];
  if (!entry || typeof entry !== "object") return "";
  const value = (entry as { value?: unknown }).value;
  return typeof value === "string" ? value : "";
}

export function safeLicenseUrl(raw: string): string | null {
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

/** Pages of a MediaWiki query response, whether keyed by id or listed. */
export function queryPages(json: unknown): unknown[] {
  if (!json || typeof json !== "object") return [];
  const query = (json as { query?: unknown }).query;
  if (!query || typeof query !== "object") return [];
  const pages = (query as { pages?: unknown }).pages;
  if (Array.isArray(pages)) return pages;
  return pages && typeof pages === "object" ? Object.values(pages) : [];
}

/** Keep the first photo per source page and per title. */
export function dedupePhotos(list: PartPhoto[]): PartPhoto[] {
  const seen = new Set<string>();
  const out: PartPhoto[] = [];
  for (const photo of list) {
    const keys = [photo.sourceUrl, photo.thumbUrl];
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(photo);
  }
  return out;
}
