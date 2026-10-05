import {
  type FetchLike,
  type PartPhoto,
  type SourceResult,
  SOURCE_TIMEOUT_MS,
  cleanAuthor,
  cleanName,
  dedupePhotos,
  fileTitle,
  getJson,
  isAllowedLicense,
  isHttpsOn,
  isImageUrl,
  metaValue,
  queryPages,
  safeLicenseUrl,
  stripHtml,
  titleMatches,
} from "./photo-shared";

/**
 * Wikimedia Commons lookup for real reference photos.
 *
 * Commons images are openly licensed and the API is free to use with a
 * descriptive User-Agent. Everything here is pure (or takes an injected
 * fetch) so it can be unit tested without the network.
 */

export { fileTitle, scoreTitle, stripHtml } from "./photo-shared";

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/** Bucket for the part-photos route: 60 requests per hour per client. */
export const PART_PHOTOS_LIMIT = {
  bucket: "part-photos",
  limit: 60,
  windowMs: 60 * 60_000,
} as const;

export const MAX_PHOTOS = 3;
const SEARCH_LIMIT = 10;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const IMAGEINFO = {
  prop: "imageinfo",
  iiprop: "url|extmetadata|mime",
  iiurlwidth: "480",
  iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|ObjectName",
  format: "json",
} as const;

export function buildCommonsUrl(query: string): string {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: cleanName(query),
    gsrnamespace: "6",
    gsrlimit: String(SEARCH_LIMIT),
    ...IMAGEINFO,
  });
  return `${COMMONS_API}?${params.toString()}`;
}

/** Imageinfo for specific Commons files, by "File:Name.jpg" title. */
export function buildCommonsFilesUrl(fileTitles: string[]): string {
  const params = new URLSearchParams({
    action: "query",
    titles: fileTitles.join("|"),
    ...IMAGEINFO,
  });
  return `${COMMONS_API}?${params.toString()}`;
}

type Candidate = { photo: PartPhoto; rank: number };

/**
 * One Commons file page as a photo, or null when it is not a safe, free,
 * relevant photo. `query` null skips the title check (the caller already
 * chose the file, as Wikipedia does).
 */
export function commonsPageToPhoto(
  page: unknown,
  query: string | null,
  source: PartPhoto["source"] = "commons",
): Candidate | null {
  if (!page || typeof page !== "object") return null;
  const record = page as { title?: unknown; index?: unknown; imageinfo?: unknown };
  if (typeof record.title !== "string") return null;
  const info = Array.isArray(record.imageinfo) ? record.imageinfo[0] : null;
  if (!info || typeof info !== "object") return null;
  const { thumburl, url, descriptionurl, mime, extmetadata } = info as {
    thumburl?: unknown;
    url?: unknown;
    descriptionurl?: unknown;
    mime?: unknown;
    extmetadata?: unknown;
  };

  if (typeof mime !== "string" || !ALLOWED_MIME.has(mime)) return null;
  if (!isImageUrl(thumburl)) return null;
  if (!isImageUrl(url)) return null;
  if (!isHttpsOn(descriptionurl, "commons.wikimedia.org")) return null;

  const license = stripHtml(metaValue(extmetadata, "LicenseShortName"));
  if (!isAllowedLicense(license)) return null;

  const title = fileTitle(record.title);
  if (query !== null && !titleMatches(title, query)) return null;

  return {
    photo: {
      url,
      thumbUrl: thumburl,
      title,
      author: cleanAuthor(metaValue(extmetadata, "Artist")),
      license,
      licenseUrl: safeLicenseUrl(metaValue(extmetadata, "LicenseUrl")),
      sourceUrl: descriptionurl,
      source,
    },
    rank: typeof record.index === "number" ? record.index : 1000,
  };
}

/** Turn a raw Commons search response into at most `max` safe, relevant photos. */
export function shapeCommonsResponse(
  json: unknown,
  query: string,
  max: number = MAX_PHOTOS,
): PartPhoto[] {
  return queryPages(json)
    .map((page) => commonsPageToPhoto(page, query))
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, max)
    .map((c) => c.photo);
}

/**
 * Search Commons with each query in turn until `max` photos are found.
 * Never throws; `ok` is false only when every call failed.
 */
export async function searchCommons(
  queries: string[],
  fetchImpl: FetchLike = fetch,
  max: number = MAX_PHOTOS,
): Promise<SourceResult> {
  const end = Date.now() + SOURCE_TIMEOUT_MS;
  let found: PartPhoto[] = [];
  let attempts = 0;
  let failures = 0;
  for (const query of queries) {
    if (found.length >= max || Date.now() >= end) break;
    attempts += 1;
    try {
      const json = await getJson(
        buildCommonsUrl(query),
        fetchImpl,
        Math.max(1, end - Date.now()),
      );
      found = dedupePhotos([...found, ...shapeCommonsResponse(json, query, max)]);
    } catch {
      failures += 1;
    }
  }
  return { images: found.slice(0, max), ok: attempts === 0 || failures < attempts };
}

/** Commons imageinfo for known file titles, keyed by file title. */
export async function fetchCommonsFiles(
  fileTitles: string[],
  fetchImpl: FetchLike,
  source: PartPhoto["source"],
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<Map<string, PartPhoto>> {
  const out = new Map<string, PartPhoto>();
  if (fileTitles.length === 0) return out;
  const json = await getJson(buildCommonsFilesUrl(fileTitles), fetchImpl, timeoutMs);
  for (const page of queryPages(json)) {
    const candidate = commonsPageToPhoto(page, null, source);
    if (candidate) out.set(candidate.photo.title.toLowerCase(), candidate.photo);
  }
  return out;
}
