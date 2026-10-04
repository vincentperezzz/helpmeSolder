import { NextRequest } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api/auth";
import { createGuide } from "@/lib/guides/repository";
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

  const body = createSchema.parse(await request.json().catch(() => ({})));
  const guide = await createGuide(body);
  const validation = validateGuide(guide);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return Response.json(
    {
      guide,
      validation,
      url: `${appUrl}/guides/${guide.id}`,
    },
    { status: 201 },
  );
}
