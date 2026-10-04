import { NextRequest } from "next/server";

export function assertApiAuth(request: NextRequest): Response | null {
  const expected = process.env.MCP_API_KEY;
  if (!expected) {
    return null;
  }

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : request.headers.get("x-api-key");

  if (token !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
