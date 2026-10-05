import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { RawMediaRow, RawPartRow, RawRecipeRow, RawRows } from "../registry";

// SERVER-ONLY (uses the service-role client). Imported from server.ts only.

export const CATALOG_TAG = "catalog";

/**
 * Published data only. `draft` is never selected: unpublished work must not be
 * able to reach the live registry (a test pins these column lists).
 */
export const PART_COLUMNS =
  "id, kind, published, seed_base, origin, lifecycle, replaced_by, version";
export const RECIPE_COLUMNS =
  "id, published, seed_base, origin, lifecycle, replaced_by, version";
export const MEDIA_COLUMNS = "photo_hint, url";
export const SETTINGS_COLUMNS = "mode";

/** Rows that can change the live catalog: published, or deprecated (lifecycle-only). */
export const LIVE_ROWS_FILTER = "published.not.is.null,lifecycle.eq.deprecated";

function fail(table: string, error: { message: string } | null): never {
  throw new Error(`catalog ${table}: ${error?.message ?? "unknown error"}`);
}

export async function fetchCatalogRows(client: SupabaseClient): Promise<RawRows> {
  const [parts, recipes, media, settings] = await Promise.all([
    client
      .from("catalog_parts")
      .select(PART_COLUMNS)
      .or(LIVE_ROWS_FILTER)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    client
      .from("catalog_recipes")
      .select(RECIPE_COLUMNS)
      .or(LIVE_ROWS_FILTER)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    client.from("catalog_media").select(MEDIA_COLUMNS).order("photo_hint", { ascending: true }),
    client.from("catalog_settings").select(SETTINGS_COLUMNS).eq("id", 1),
  ]);

  if (parts.error) fail("catalog_parts", parts.error);
  if (recipes.error) fail("catalog_recipes", recipes.error);
  if (media.error) fail("catalog_media", media.error);
  if (settings.error) fail("catalog_settings", settings.error);

  const mode = (settings.data as { mode?: string }[] | null)?.[0]?.mode;
  return {
    parts: (parts.data ?? []) as unknown as RawPartRow[],
    recipes: (recipes.data ?? []) as unknown as RawRecipeRow[],
    media: (media.data ?? []) as unknown as RawMediaRow[],
    settings: { mode: mode === "seed" ? "seed" : "db" },
  };
}

/**
 * Cached across requests by the Next data cache. Tag expiry
 * (`revalidateTag(CATALOG_TAG, { expire: 0 })`) drops it on publish; the 300 s
 * `revalidate` is the safety net for instances the tag call did not reach.
 */
export const loadCatalogRowsCached = unstable_cache(
  () => fetchCatalogRows(getSupabaseAdmin()),
  ["catalog-rows-v1"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);
