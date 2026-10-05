import { NextRequest } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api/auth";
import { guarded, notFound, parseBody } from "@/lib/api/http";
import { WRITE_LIMIT, checkRateLimit } from "@/lib/api/rate-limit";
import { getGuide, updateGuide } from "@/lib/guides/repository";
import { powerSourceInputSchema } from "@/lib/guides/power-source";
import { validateGuide } from "@/lib/guides/validator";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  power_source: powerSourceInputSchema,
});

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const limited = checkRateLimit(request, WRITE_LIMIT);
  if (limited) {
    return limited;
  }

  return guarded(async () => {
    const { id } = await context.params;
    const existing = await getGuide(id);
    if (!existing) {
      return notFound();
    }

    const parsed = await parseBody(request, schema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const guide = await updateGuide(id, { power_source: parsed.data.power_source });

    return Response.json({
      guide,
      validation: validateGuide(guide),
    });
  });
}
