/**
 * Cache-Control values for /api/part-photos, chosen per response so an empty
 * or failed answer is never pinned like a found one.
 */

/** Found photos change rarely: cache them at the CDN for a week. */
export const CACHE_FOUND = "public, s-maxage=604800, stale-while-revalidate=86400";
/** An empty answer is retried within minutes: a source may only have been down. */
export const CACHE_EMPTY = "public, s-maxage=300, stale-while-revalidate=60";
/** A failed lookup is not cached at all. */
export const CACHE_FAILED = "no-store";
