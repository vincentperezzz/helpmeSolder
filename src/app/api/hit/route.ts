import { NextRequest } from "next/server";
import { HIT_LIMIT, recordClient } from "@/lib/analytics/clients";
import { checkRateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/** Anonymous visit beacon. No auth: it must work for plain browsers. */
export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, HIT_LIMIT);
  if (limited) {
    return limited;
  }
  await recordClient("visitor", request);
  return new Response(null, { status: 204 });
}
