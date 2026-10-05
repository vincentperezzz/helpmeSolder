import {
  type FetchLike,
  type PartPhoto,
  type SourceResult,
  SOURCE_TIMEOUT_MS,
  cleanAuthor,
  cleanName,
  dedupePhotos,
  getJson,
  isAllowedLicense,
  isHttpsUrl,
  splitQuery,
  stripHtml,
  titleMatches,
} from "./photo-shared";

/**
 * Openverse (anonymous): openly licensed images from Flickr, Wikimedia and
 * others. Thumbnails always come through api.openverse.org so no other host
 * is ever loaded by the page; the original site is only linked.
 */

export const OPENVERSE_API = "https://api.openverse.org/v1/images/";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFERRED_SOURCES = new Set(["wikimedia", "flickr", "geographorguk", "smithsonian"]);

export function buildOpenverseUrl(query: string): string {
  const params = new URLSearchParams({
    q: cleanName(splitQuery(query).include),
    license_type: "commercial,modification",
    mature: "false",
    page_size: "8",
  });
  return `${OPENVERSE_API}?${params.toString()}`;
}

/** Openverse licence codes as the short names the rest of the app shows. */
export function openverseLicenseName(code: unknown, version: unknown): string {
  if (typeof code !== "string") return "";
  const v = typeof version === "string" && version ? ` ${version}` : "";
  const c = code.toLowerCase();
  if (c === "cc0") return "CC0 1.0";
  if (c === "pdm") return "Public domain";
  if (c === "by") return `CC BY${v}`;
  if (c === "by-sa") return `CC BY-SA${v}`;
  return code.toUpperCase();
}

export function shapeOpenverseResponse(
  json: unknown,
  query: string,
  max: number = 3,
): PartPhoto[] {
  const results = (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  const photos: { photo: PartPhoto; preferred: boolean; rank: number }[] = [];
  results.forEach((item: unknown, rank) => {
    if (!item || typeof item !== "object") return;
    const r = item as Record<string, unknown>;
    if (r.mature === true) return;
    if (typeof r.id !== "string" || !UUID.test(r.id)) return;
    const title = typeof r.title === "string" ? stripHtml(r.title) : "";
    if (!title || !titleMatches(title, query)) return;
    const license = openverseLicenseName(r.license, r.license_version);
    if (!isAllowedLicense(license)) return;
    if (!isHttpsUrl(r.foreign_landing_url)) return;

    const thumb = `${OPENVERSE_API}${r.id.toLowerCase()}/thumb/`;
    const licenseUrl = isHttpsUrl(r.license_url) ? r.license_url : null;
    photos.push({
      photo: {
        url: thumb,
        thumbUrl: thumb,
        title,
        author: cleanAuthor(r.creator),
        license,
        licenseUrl,
        sourceUrl: r.foreign_landing_url,
        source: "openverse",
      },
      preferred: PREFERRED_SOURCES.has(String(r.source ?? "").toLowerCase()),
      rank,
    });
  });
  return photos
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.rank - b.rank)
    .slice(0, max)
    .map((p) => p.photo);
}

/** Never throws; `ok` is false only when every call failed. */
export async function searchOpenverse(
  queries: string[],
  fetchImpl: FetchLike = fetch,
  max: number = 3,
): Promise<SourceResult> {
  const end = Date.now() + SOURCE_TIMEOUT_MS;
  let found: PartPhoto[] = [];
  let attempts = 0;
  let failures = 0;
  for (const query of queries.slice(0, 2)) {
    if (found.length >= max || Date.now() >= end) break;
    attempts += 1;
    try {
      const json = await getJson(
        buildOpenverseUrl(query),
        fetchImpl,
        Math.max(1, end - Date.now()),
      );
      found = dedupePhotos([...found, ...shapeOpenverseResponse(json, query, max)]);
    } catch {
      failures += 1;
    }
  }
  return { images: found.slice(0, max), ok: attempts === 0 || failures < attempts };
}
