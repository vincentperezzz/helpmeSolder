import { NextRequest } from "next/server";
import { assertApiAuth } from "@/lib/api/auth";
import { listCatalog } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  return Response.json(listCatalog());
}
