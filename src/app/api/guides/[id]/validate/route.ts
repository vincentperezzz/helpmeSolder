import { NextRequest } from "next/server";
import { assertApiAuth } from "@/lib/api/auth";
import { getGuide } from "@/lib/guides/repository";
import { validateGuide } from "@/lib/guides/validator";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const guide = await getGuide(id);
  if (!guide) {
    return Response.json({ error: "Guide not found" }, { status: 404 });
  }

  const validation = validateGuide(guide);
  return Response.json({
    guideId: guide.id,
    validation,
    blocked: !validation.ok,
  });
}
