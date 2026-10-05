import { NextRequest } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api/auth";
import { guarded, notFound, parseBody } from "@/lib/api/http";
import { WRITE_LIMIT, checkRateLimit } from "@/lib/api/rate-limit";
import { getCatalogPart } from "@/lib/catalog";
import { ensureCatalog } from "@/lib/catalog/server";
import { recordPartRequestLater } from "@/lib/requests/record";
import { getGuide, updateGuide } from "@/lib/guides/repository";
import { powerSourceNullableInputSchema } from "@/lib/guides/power-source";
import { validateGuide } from "@/lib/guides/validator";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  title: z.string().optional(),
  power_source: powerSourceNullableInputSchema.optional(),
  board_id: z.string().nullable().optional(),
  parts: z
    .array(
      z.object({
        instanceId: z.string(),
        catalogId: z.string(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  connections: z
    .array(
      z.object({
        id: z.string(),
        from: z.object({ instanceId: z.string(), pinId: z.string() }),
        to: z.object({ instanceId: z.string(), pinId: z.string() }),
        note: z.string().optional(),
      }),
    )
    .optional(),
  steps: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string(),
        order: z.number().int(),
      }),
    )
    .optional(),
  notes: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  return guarded(async () => {
    await ensureCatalog();
    const { id } = await context.params;
    const guide = await getGuide(id);
    if (!guide) {
      return notFound();
    }

    return Response.json({
      guide,
      validation: validateGuide(guide),
    });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }
  const limited = checkRateLimit(request, WRITE_LIMIT);
  if (limited) {
    return limited;
  }

  return guarded(async () => {
    await ensureCatalog();
    const { id } = await context.params;
    const existing = await getGuide(id);
    if (!existing) {
      return notFound();
    }

    const parsed = await parseBody(request, patchSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const guide = await updateGuide(id, parsed.data);
    const validation = validateGuide(guide);

    for (const part of guide.parts) {
      if (!getCatalogPart(part.catalogId)) {
        recordPartRequestLater({ name: part.catalogId, source: "api_patch", request });
      }
    }

    if (!validation.ok) {
      return Response.json(
        {
          guide,
          validation,
          blocked: true,
        },
        { status: 422 },
      );
    }

    return Response.json({ guide, validation, blocked: false });
  });
}
