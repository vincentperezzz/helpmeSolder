import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getCatalogPart } from "@/lib/catalog";
import { PART_PHOTOS_LIMIT } from "@/lib/catalog/commons";
import { partCategory } from "@/lib/catalog/part-media";
import { ensureCatalog } from "@/lib/catalog/server";
import { findPartPhotos } from "@/lib/catalog/photo-chain";
import { CACHE_EMPTY, CACHE_FAILED, CACHE_FOUND } from "@/lib/catalog/photo-cache";

export const dynamic = "force-dynamic";

/**
 * Real reference photos for one catalog part, from free sources in turn:
 * Wikimedia Commons, Wikipedia, Openverse.
 *
 * Not a proxy: the caller sends a catalog id only. The search text is built
 * here from the catalog, and only image URLs on known hosts are returned.
 * Cache-Control is set here, per response, so an empty result is never cached
 * like a full one.
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, PART_PHOTOS_LIMIT);
  if (limited) return limited;

  // `v` is a cache-busting revision (see getPartRevision); accepted and ignored.
  const v = request.nextUrl.searchParams.get("v");
  if (v !== null && !/^[a-z0-9]{1,16}$/.test(v)) {
    return NextResponse.json(
      { images: [] },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  await ensureCatalog();
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const part = id.length > 0 && id.length <= 64 ? getCatalogPart(id) : undefined;
  if (!part) {
    return NextResponse.json(
      { images: [] },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { images, complete } = await findPartPhotos(part, partCategory(part));
    const cache =
      images.length > 0 ? CACHE_FOUND : complete ? CACHE_EMPTY : CACHE_FAILED;
    return NextResponse.json({ images }, { headers: { "Cache-Control": cache } });
  } catch {
    return NextResponse.json(
      { images: [] },
      { headers: { "Cache-Control": CACHE_FAILED } },
    );
  }
}
