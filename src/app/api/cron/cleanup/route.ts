import { NextRequest } from "next/server";
import { safeEqual } from "@/lib/api/auth";
import { guarded, jsonError } from "@/lib/api/http";
import { deleteExpiredGuides } from "@/lib/guides/repository";
import { getRetentionDays } from "@/lib/guides/retention";

export const dynamic = "force-dynamic";

/** Vercel Cron: deletes guides unopened for GUIDE_RETENTION_DAYS. */
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
    const retentionDays = getRetentionDays();
    const deleted = await deleteExpiredGuides(retentionDays);
    return Response.json({ deleted, retentionDays });
  });
}
