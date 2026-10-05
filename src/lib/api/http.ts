import type { z } from "zod";

export function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error, ...extra }, { status });
}

export function notFound(what = "Guide"): Response {
  return jsonError(404, `${what} not found`);
}

/** Logs the real error server-side; returns a generic 500 with no internals. */
export function serverError(error: unknown): Response {
  console.error("[api] unhandled error:", error);
  return jsonError(500, "Internal server error");
}

export function validationError(error: z.ZodError): Response {
  return jsonError(400, "Invalid request body", {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    })),
  });
}

export type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/**
 * Reads JSON and validates with safeParse. Malformed JSON -> 400.
 * An empty body is treated as `{}` only when `allowEmpty` is set.
 */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  options: { allowEmpty?: boolean } = {},
): Promise<ParsedBody<z.infer<S>>> {
  let raw: unknown;
  const text = await request.text();
  if (text.trim() === "" && options.allowEmpty) {
    raw = {};
  } else {
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, response: jsonError(400, "Request body must be valid JSON") };
    }
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: validationError(result.error) };
  }
  return { ok: true, data: result.data };
}

/** Wraps a handler so any thrown error becomes a generic 500 JSON response. */
export async function guarded(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    return serverError(error);
  }
}
