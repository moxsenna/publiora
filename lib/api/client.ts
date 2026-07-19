import { ApiError } from "./errors";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    const errorData = body?.error;
    const message =
      typeof errorData === "string"
        ? errorData
        : errorData?.message ?? res.statusText;
    const code =
      typeof errorData === "string"
        ? body?.code
        : errorData?.code;
    throw new ApiError(message, code, res.status);
  }
  return body as T;
}
