export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status = 400
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Return a JSON error response.
 *
 * When `extra` is provided the response flattens into a top-level structure
 * matching the API spec for structured error responses (e.g. 409 blockers):
 *
 *   { error: "message", code: "code", ...extra }
 *
 * When `extra` is omitted, the original backward-compatible shape is used:
 *
 *   { error: { message: "message", code: "code" } }
 */
export function jsonError(
  message: string,
  status = 400,
  code?: string,
  extra?: Record<string, unknown>,
) {
  if (extra) {
    return Response.json(
      { error: message, code: code ?? undefined, ...extra },
      { status },
    );
  }
  return Response.json({ error: { message, code } }, { status });
}
