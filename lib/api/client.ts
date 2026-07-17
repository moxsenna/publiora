import { ApiError } from "./errors";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
  ) {
    throw new ApiError(
      "Mock API cannot run in production",
      "mock_forbidden",
      500
    );
  }

  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      body?.error?.message ?? res.statusText,
      body?.error?.code,
      res.status
    );
  }
  return body as T;
}
