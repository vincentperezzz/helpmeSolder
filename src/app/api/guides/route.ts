import { NextRequest } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/lib/api/app-url";
import { recordClientLater } from "@/lib/analytics/clients";
import { assertApiAuth } from "@/lib/api/auth";
import { guarded, parseBody } from "@/lib/api/http";
import { CREATE_LIMIT, checkRateLimit } from "@/lib/api/rate-limit";
import { ensureCatalog } from "@/lib/catalog/server";
import { createGuide } from "@/lib/guides/repository";
import { getRetentionDays, retentionNotice } from "@/lib/guides/retention";
import { validateGuide } from "@/lib/guides/validator";

const createSchema = z.object({
  title: z.string().optional(),
  board_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }
  const limited = checkRateLimit(request, CREATE_LIMIT);
  if (limited) {
    return limited;
  }

  return guarded(async () => {
    await ensureCatalog();
    const parsed = await parseBody(request, createSchema, { allowEmpty: true });
    if (!parsed.ok) {
      return parsed.response;
    }

    const guide = await createGuide(parsed.data);
    recordClientLater("creator", request);
    const validation = validateGuide(guide);
    const appUrl = getAppUrl(request);

    return Response.json(
      {
        guide,
        validation,
        url: `${appUrl}/guides/${guide.id}`,
        retention: { days: getRetentionDays(), message: retentionNotice() },
      },
      { status: 201 },
    );
  });
}
