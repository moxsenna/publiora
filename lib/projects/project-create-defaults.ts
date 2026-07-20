// Defaults for type-aware project creation.

export const DEFAULT_TONE = "Praktis, jelas";

export const DEFAULT_COVER_COLOR = "#6366f1";

export function resolveAuthorFallback(input: {
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}): string {
  const full = input.full_name?.trim();
  if (full) return full;
  const display = input.display_name?.trim();
  if (display) return display;
  const email = input.email?.trim();
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
  }
  return "Penulis";
}
