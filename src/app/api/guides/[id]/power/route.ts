import { NextRequest } from "next/server";
import { z } from "zod";
import { assertApiAuth } from "@/lib/api/auth";
import { guarded, notFound, parseBody } from "@/lib/api/http";
import { WRITE_LIMIT, checkRateLimit } from "@/lib/api/rate-limit";
import { ensureCatalog } from "@/lib/catalog/server";
import { getGuide, updateGuide } from "@/lib/guides/repository";
import { matchPowerSource, powerSourceInputSchema } from "@/lib/guides/power-source";
import { recordPartRequestLater } from "@/lib/requests/record";
import { validateGuide } from "@/lib/guides/validator";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const schema = z.object({
  power_source: powerSourceInputSchema,
});

/** Best-effort: notes an unsupported power source name. Never throws. */
async function noteUnsupported(copy: Request, request: Request) {
  try {
    const body: unknown = await copy.json();
    const value = (body as { power_source?: unknown } | null)?.power_source;
    if (typeof value === "string" && value.trim() !== "" && !matchPowerSource(value)) {
      recordPartRequestLater({
        name: value.slice(0, 80),
        kind: "power",
        source: "set_power_source",
        request,
      });
    }
  } catch {
    // Ignore: the caller still gets the 400.
  }
}

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
    await ensureCatalog();
    const { id } = await context.params;
    const existing = await getGuide(id);
    if (!existing) {
      return notFound();
    }

    const copy = request.clone();
    const parsed = await parseBody(request, schema);
    if (!parsed.ok) {
      await noteUnsupported(copy, request);
      return parsed.response;
    }

    const guide = await updateGuide(id, { power_source: parsed.data.power_source });

    return Response.json({
      guide,
      validation: validateGuide(guide),
    });
  });
}
