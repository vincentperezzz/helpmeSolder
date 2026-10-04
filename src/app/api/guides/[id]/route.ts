import { NextRequest } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api/auth";
import { getGuide, updateGuide } from "@/lib/guides/repository";
import { powerSourceNullableInputSchema } from "@/lib/guides/power-source";
import { validateGuide } from "@/lib/guides/validator";

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

  const { id } = await context.params;
  const guide = await getGuide(id);
  if (!guide) {
    return Response.json({ error: "Guide not found" }, { status: 404 });
  }

  return Response.json({
    guide,
    validation: validateGuide(guide),
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const existing = await getGuide(id);
  if (!existing) {
    return Response.json({ error: "Guide not found" }, { status: 404 });
  }

  const body = patchSchema.parse(await request.json());
  const guide = await updateGuide(id, body);
  const validation = validateGuide(guide);

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
}
