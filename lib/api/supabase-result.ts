/** Helpers for explicit Supabase PostgREST { data, error } handling. */

export type SupabaseLikeError = { message?: string } | null | undefined;

export function getSupabaseErrorMessage(
  error: SupabaseLikeError,
  fallback = "Database error",
): string {
  if (!error) return fallback;
  if (typeof error === "object" && "message" in error && error.message) {
    return String(error.message);
  }
  return fallback;
}

/**
 * Assert a Supabase result has no error. Throws Error with message if present.
 * Use when you want try/catch outer handlers, or call and check return.
 */
export function assertNoSupabaseError(
  error: SupabaseLikeError,
  fallback = "Database error",
): void {
  if (error) {
    throw new Error(getSupabaseErrorMessage(error, fallback));
  }
}
