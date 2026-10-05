import type { PartCategory } from "./part-media";
import { MAX_PHOTOS, searchCommons } from "./commons";
import { searchOpenverse } from "./openverse";
import {
  type FetchLike,
  type PartPhoto,
  type PhotoSource,
  type SourceResult,
  dedupePhotos,
} from "./photo-shared";
import { photoQueriesFor } from "./photo-queries";
import { searchWikipedia } from "./wikipedia";

/**
 * Outside photos for one catalog part, from several free sources in order:
 * Wikimedia Commons, then Wikipedia lead images, then Openverse. Each source
 * is tried only until there are enough photos, never throws, and a failing
 * source never stops the next one. When all come back empty the caller keeps
 * showing our own illustration.
 */

export type PhotoChainResult = {
  images: PartPhoto[];
  /** False when a source failed and nothing was found, so retry sooner. */
  complete: boolean;
  /** How each source did, for logs and tests. */
  trace: { source: PhotoSource; found: number; ok: boolean }[];
};

type Part = { id: string; name: string; photoHint?: string; kind?: string };

export async function findPartPhotos(
  part: Part,
  category: PartCategory,
  fetchImpl: FetchLike = fetch,
  max: number = MAX_PHOTOS,
): Promise<PhotoChainResult> {
  const q = photoQueriesFor(part, category);
  const steps: { source: PhotoSource; run: () => Promise<SourceResult> }[] = [
    { source: "commons", run: () => searchCommons(q.commons, fetchImpl, max) },
    {
      source: "wikipedia",
      run: () => searchWikipedia(q.wikipedia, q.commons, fetchImpl, max),
    },
    { source: "openverse", run: () => searchOpenverse(q.openverse, fetchImpl, max) },
  ];

  let images: PartPhoto[] = [];
  const trace: PhotoChainResult["trace"] = [];
  for (const step of steps) {
    if (images.length >= max) break;
    let result: SourceResult;
    try {
      result = await step.run();
    } catch {
      result = { images: [], ok: false };
    }
    trace.push({ source: step.source, found: result.images.length, ok: result.ok });
    images = dedupePhotos([...images, ...result.images]);
  }
  const anyFailed = trace.some((t) => !t.ok);
  return {
    images: images.slice(0, max),
    complete: images.length > 0 || !anyFailed,
    trace,
  };
}
