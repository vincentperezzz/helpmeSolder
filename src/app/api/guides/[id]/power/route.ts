import { NextRequest } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api/auth";
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

  const { id } = await context.params;
  const existing = await getGuide(id);
  if (!existing) {
    return Response.json({ error: "Guide not found" }, { status: 404 });
  }

  const body = schema.parse(await request.json());
  const guide = await updateGuide(id, { power_source: body.power_source });

  return Response.json({
    guide,
    validation: validateGuide(guide),
  });
}
