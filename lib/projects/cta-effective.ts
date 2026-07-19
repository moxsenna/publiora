import {
  CTA_URL_REQUIRED_GOALS,
  isValidCtaUrl,
  type CtaGoal,
} from "@/types/ai-suggestions";

export type CtaFields = {
  cta_goal?: CtaGoal | string | null;
  cta_url?: string | null;
  final_cta?: string | null;
};

/**
 * Merge patch over existing CTA fields and validate effective state.
 * Returns null if valid, or an error message if invalid.
 */
export function validateEffectiveCta(
  existing: CtaFields,
  patch: CtaFields,
): string | null {
  const effectiveGoal =
    "cta_goal" in patch ? (patch.cta_goal ?? null) : (existing.cta_goal ?? null);
  const effectiveUrl =
    "cta_url" in patch ? (patch.cta_url ?? null) : (existing.cta_url ?? null);

  if (
    effectiveGoal &&
    (CTA_URL_REQUIRED_GOALS as readonly string[]).includes(String(effectiveGoal))
  ) {
    if (effectiveUrl == null || !isValidCtaUrl(String(effectiveUrl))) {
      return "A valid http(s) cta_url is required for this cta_goal";
    }
  }

  if (
    "cta_url" in patch &&
    patch.cta_url != null &&
    !isValidCtaUrl(String(patch.cta_url))
  ) {
    return "cta_url must be a valid http(s) URL";
  }

  return null;
}
