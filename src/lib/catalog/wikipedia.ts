import { fetchCommonsFiles } from "./commons";
import {
  type FetchLike,
  type PartPhoto,
  type SourceResult,
  SOURCE_TIMEOUT_MS,
  cleanName,
  dedupePhotos,
  fileTitle,
  getJson,
  looksLikeDrawing,
  queryPages,
  splitQuery,
  titleMatches,
} from "./photo-shared";

/**
 * Wikipedia lead images. An article's image is either a Commons file (free,
 * with full licence data there) or a local fair-use upload. Only the first
 * kind is accepted: the file is looked up on Commons and anything Commons
 * does not host is skipped.
 */

export const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

const BASE = {
  action: "query",
  prop: "pageimages",
  piprop: "name",
  format: "json",
} as const;

/** Lead images of named articles (redirects followed). */
export function buildWikipediaTitlesUrl(titles: string[]): string {
  const params = new URLSearchParams({
    ...BASE,
    titles: titles.map(cleanName).join("|"),
    redirects: "1",
  });
  return `${WIKIPEDIA_API}?${params.toString()}`;
}

/** Lead images of the best articles matching a search. */
export function buildWikipediaSearchUrl(query: string): string {
  const params = new URLSearchParams({
    ...BASE,
    generator: "search",
    gsrsearch: cleanName(splitQuery(query).include),
    gsrnamespace: "0",
    gsrlimit: "3",
  });
  return `${WIKIPEDIA_API}?${params.toString()}`;
}

/** "File:" titles of the lead images in a response, best article first. */
export function leadImageFiles(json: unknown, query: string | null): string[] {
  const pages = queryPages(json)
    .map((p) => p as { title?: unknown; pageimage?: unknown; index?: unknown })
    .filter((p) => typeof p.title === "string" && typeof p.pageimage === "string")
    .filter((p) => query === null || titleMatches(p.title as string, query))
    .sort(
      (a, b) =>
        (typeof a.index === "number" ? a.index : 1000) -
        (typeof b.index === "number" ? b.index : 1000),
    );
  const files = pages
    .map((p) => `File:${(p.pageimage as string).replace(/_/g, " ")}`)
    .filter((f) => !looksLikeDrawing(f));
  return [...new Set(files)];
}

/**
 * Photos from Wikipedia articles. `articles` are exact article titles;
 * `searches` are free-text queries used only when no article is named.
 * Never throws; `ok` is false when the calls failed.
 */
export async function searchWikipedia(
  articles: string[],
  searches: string[],
  fetchImpl: FetchLike = fetch,
  max: number = 3,
): Promise<SourceResult> {
  const end = Date.now() + SOURCE_TIMEOUT_MS;
  const remaining = () => Math.max(1, end - Date.now());
  try {
    let files: string[] = [];
    if (articles.length > 0) {
      files = leadImageFiles(
        await getJson(buildWikipediaTitlesUrl(articles), fetchImpl, remaining()),
        null,
      );
    } else {
      for (const query of searches.slice(0, 2)) {
        if (files.length >= max || Date.now() >= end) break;
        const found = leadImageFiles(
          await getJson(buildWikipediaSearchUrl(query), fetchImpl, remaining()),
          query,
        );
        files = [...new Set([...files, ...found])];
      }
    }
    if (files.length === 0) return { images: [], ok: true };
    const byTitle = await fetchCommonsFiles(
      files.slice(0, max),
      fetchImpl,
      "wikipedia",
      remaining(),
    );
    const images = files
      .map((f) => byTitle.get(fileTitle(f).toLowerCase()))
      .filter((p): p is PartPhoto => p !== undefined);
    return { images: dedupePhotos(images).slice(0, max), ok: true };
  } catch {
    return { images: [], ok: false };
  }
}
