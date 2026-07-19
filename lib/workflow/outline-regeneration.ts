// Pure gate for outline regenerate paths (used by generate route + unit tests).

export type OutlineRegenerationGate = {
  hasOutline: boolean;
  hasWrittenContent: boolean;
  confirmReset: boolean;
};

export type OutlineRegenerationDecision =
  | { allowed: true; mode: "create" | "free_regenerate" | "confirmed_reset" }
  | {
      allowed: false;
      code: "outline_regenerate_blocked";
      mode: "blocked";
    };

/**
 * Decide whether outline generation/regeneration may proceed.
 *
 * - No outline → create (allowed)
 * - Outline, no written content → free regenerate (allowed)
 * - Outline + written content + confirmReset → confirmed reset (allowed)
 * - Outline + written content + !confirmReset → blocked
 */
export function canRegenerateOutline(
  input: OutlineRegenerationGate,
): OutlineRegenerationDecision {
  if (!input.hasOutline) {
    return { allowed: true, mode: "create" };
  }

  if (!input.hasWrittenContent) {
    return { allowed: true, mode: "free_regenerate" };
  }

  if (input.confirmReset) {
    return { allowed: true, mode: "confirmed_reset" };
  }

  return {
    allowed: false,
    code: "outline_regenerate_blocked",
    mode: "blocked",
  };
}
