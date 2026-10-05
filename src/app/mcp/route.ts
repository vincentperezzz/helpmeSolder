import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/api/app-url";
import { recordClientLater } from "@/lib/analytics/clients";
import { assertApiAuth } from "@/lib/api/auth";
import { serverError } from "@/lib/api/http";
import {
  CREATE_LIMIT,
  WRITE_LIMIT,
  checkRateLimit,
} from "@/lib/api/rate-limit";
import { createMcpServer } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

/**
 * Remote MCP endpoint (Streamable HTTP, stateless). Clients connect to
 * https://<host>/mcp; every request gets a fresh server so nothing is shared
 * between serverless invocations.
 */
async function handle(request: NextRequest): Promise<Response> {
  const unauthorized = assertApiAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const server = createMcpServer({
      appUrl: getAppUrl(request),
      recordCreator: () => recordClientLater("creator", request),
      rateLimit: (bucket) => {
        const limited = checkRateLimit(
          request,
          bucket === "create" ? CREATE_LIMIT : WRITE_LIMIT,
        );
        if (!limited) {
          return null;
        }
        const retry = limited.headers.get("retry-after");
        return `Rate limit exceeded. Try again in ${retry ?? "a few"} seconds.`;
      },
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    return serverError(error);
  }
}

function methodNotAllowed(): Response {
  return Response.json(
    { error: "Method not allowed. This MCP server is stateless: use POST." },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export const POST = handle;
export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
