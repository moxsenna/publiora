import type { StrategySuggestedReply, EbookStrategy } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Known strategy field names (mirrors aiStrategistResponseSchema field enum)
// ---------------------------------------------------------------------------

const VALID_STRATEGY_FIELDS: Set<string> = new Set([
  "topic",
  "audience",
  "audience_sophistication",
  "primary_problem",
  "pain_points",
  "desired_outcome",
  "core_promise",
  "unique_angle",
  "content_pillars",
  "product_or_offer",
  "funnel_goal",
  "cta_goal",
  "tone",
]);

function isKnownField(field: unknown): field is keyof EbookStrategy {
  return typeof field === "string" && VALID_STRATEGY_FIELDS.has(field);
}

// ---------------------------------------------------------------------------
// normalizeStrategySuggestedReplies
// ---------------------------------------------------------------------------

/**
 * Normalize and deduplicate AI-generated suggested replies.
 *
 * Rules (applied in order):
 * 1. Trim label and message.
 * 2. Discard entries whose trimmed label is empty.
 * 3. Discard entries with a non-null, non-undefined `field` that is not a
 *    known EbookStrategy key (defensive; Zod already enforces this).
 * 4. Deduplicate case-insensitively on trimmed `message` — first occurrence wins.
 * 5. Cap at four suggestions.
 * 6. If `missingFields` is non-empty, sort so suggestions whose `field` appears
 *    in `missingFields` come first (non-matching are kept — the AI may
 *    legitimately suggest an already-completed field for follow-up).
 *
 * This helper never invents, translates, or fabricates content. If all
 * suggestions are invalid it returns `[]`.
 */
export function normalizeStrategySuggestedReplies(
  suggestions: StrategySuggestedReply[],
  missingFields: string[],
): StrategySuggestedReply[] {
  // Step 1 – trim + Step 2/3 – filter
  const seenMessages = new Set<string>();
  const missingSet = new Set(missingFields);

  const kept: StrategySuggestedReply[] = [];

  for (const raw of suggestions) {
    const label = raw.label.trim();
    const message = raw.message.trim();

    // Discard empty labels
    if (label.length === 0) continue;

    // Discard unknown fields (defensive — Zod should already reject these)
    if (raw.field !== null && raw.field !== undefined && !isKnownField(raw.field)) {
      continue;
    }

    // Dedupe case-insensitive on message
    const lowerMessage = message.toLowerCase();
    if (seenMessages.has(lowerMessage)) continue;
    seenMessages.add(lowerMessage);

    kept.push({ ...raw, label, message });
  }

  // Step 4 – cap at 4
  const capped = kept.slice(0, 4);

  // Step 5 – prioritize missing-field matches
  if (missingFields.length > 0) {
    // stable sort: matching-fielded first, others after
    capped.sort((a, b) => {
      const aMatch = a.field != null && missingSet.has(a.field as string) ? 0 : 1;
      const bMatch = b.field != null && missingSet.has(b.field as string) ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  return capped;
}

// ---------------------------------------------------------------------------
// resolveNumberedSuggestionInput
// ---------------------------------------------------------------------------

/**
 * Map composer input to a suggestion message when the user types a single
 * digit 1–N (max 4) that matches a visible suggestion. Otherwise return the
 * trimmed free-text input unchanged.
 */
export function resolveNumberedSuggestionInput(
  input: string,
  suggestions: StrategySuggestedReply[],
): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";

  if (/^[1-4]$/.test(trimmed)) {
    const index = Number(trimmed) - 1;
    const match = suggestions[index];
    if (match) return match.message;
  }

  return trimmed;
}
