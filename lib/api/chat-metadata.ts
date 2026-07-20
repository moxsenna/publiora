// Helper to construct assistant message metadata for chat persistence.
import type { ChatMessageMetadata } from "@/types/message";
import type { ProjectStateV2, StrategistResult } from "@/types/strategy";

/**
 * Build the metadata blob for an assistant chat message row.
 *
 * The returned metadata is always a plain object with string keys; empty arrays
 * are used when the strategist result does not carry suggestions.
 *
 * @param strategistResult - The output from {@link runStrategist}.
 * @param mergedState      - The merged project state _after_ applying the
 *                           strategist's state patch (see {@link mergeProjectState}).
 *                           Its `updated_at` field is used verbatim as the
 *                           `strategy_context_updated_at` value.
 */
export function buildAssistantMetadata(
  strategistResult: StrategistResult,
  mergedState: ProjectStateV2,
): ChatMessageMetadata {
  return {
    suggested_replies: strategistResult.suggested_replies ?? [],
    strategy_context_updated_at: mergedState.updated_at,
    response_language: strategistResult.response_language,
  };
}
