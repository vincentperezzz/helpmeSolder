import { NextRequest } from "next/server";
import { safeEqual } from "@/lib/api/auth";
import { guarded, jsonError } from "@/lib/api/http";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron: runs one cheap read against Supabase so the free project is
 * not paused for inactivity. Returns only ok/timestamp, never row data.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return jsonError(503, "CRON_SECRET is not configured");
  }

  const presented = request.headers.get("authorization") ?? "";
  if (!safeEqual(presented, `Bearer ${secret}`)) {
    return jsonError(401, "Unauthorized");
  }

  return guarded(async () => {
    const { error } = await getSupabaseAdmin()
      .from("guides")
      .select("id")
      .limit(1);
    if (error) {
      throw error;
    }
    return Response.json({ ok: true, at: new Date().toISOString() });
  });
}
