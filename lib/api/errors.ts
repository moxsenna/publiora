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

export function jsonError(message: string, status = 400, code?: string) {
  return Response.json({ error: { message, code } }, { status });
}
