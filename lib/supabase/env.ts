/**
 * Shared public Supabase env resolution.
 * Accepts classic anon JWT key or newer publishable key from dashboard.
 */

export type PublicSupabaseEnv = {
  url: string;
  /** Anon JWT or sb_publishable_… key */
  key: string;
};

export function getPublicSupabaseEnv(options?: {
  /** When true, return null instead of throwing on missing/placeholder */
  soft?: boolean;
}): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const soft = options?.soft ?? false;

  if (!url || !key) {
    if (soft) return null;
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  const placeholder =
    url.includes("your-project-ref") ||
    url.includes("xxxx.supabase.co") ||
    key.includes("your-anon-key") ||
    key === "eyJ...";

  if (placeholder) {
    if (soft) return null;
    throw new Error("Supabase env still uses placeholder values");
  }

  return { url, key };
}
