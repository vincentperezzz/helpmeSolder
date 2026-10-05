import { NextRequest } from "next/server";
import { assertApiAuth } from "@/lib/api/auth";
import { guarded } from "@/lib/api/http";
import { listCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  return guarded(async () => Response.json(listCatalog()));
}
