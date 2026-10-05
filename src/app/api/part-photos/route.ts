import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getCatalogPart } from "@/lib/catalog";
import {
  PART_PHOTOS_LIMIT,
  fetchCommonsImages,
} from "@/lib/catalog/commons";
import { partCategory } from "@/lib/catalog/part-media";

export const dynamic = "force-dynamic";

const FOUND = "public, s-maxage=604800, stale-while-revalidate=86400";
/** Empty or failed lookups are retried sooner than a week. */
const RETRY_SOON = "public, s-maxage=3600, stale-while-revalidate=600";

/**
 * Real reference photos for one catalog part, from Wikimedia Commons.
 *
 * Not a proxy: the caller sends a catalog id only. The search text is built
 * here from the catalog name, and only known Commons URLs are returned.
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, PART_PHOTOS_LIMIT);
  if (limited) return limited;

  const id = request.nextUrl.searchParams.get("id") ?? "";
  const part = id.length > 0 && id.length <= 64 ? getCatalogPart(id) : undefined;
  if (!part) {
    return NextResponse.json(
      { images: [] },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { images, ok } = await fetchCommonsImages(part.name, partCategory(part));
    return NextResponse.json(
      { images },
      {
        headers: {
          "Cache-Control": ok && images.length > 0 ? FOUND : RETRY_SOON,
        },
      },
    );
  } catch {
    return NextResponse.json(
      { images: [] },
      { headers: { "Cache-Control": RETRY_SOON } },
    );
  }
}
