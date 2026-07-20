import { describe, expect, it } from "vitest";
import { buildAssistantMetadata } from "@/lib/api/chat-metadata";
import type { ProjectStateV2, StrategistResult } from "@/types/strategy";
import { PROJECT_STATE_SCHEMA_VERSION, REQUIRED_STRATEGY_FIELDS } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeState(overrides?: Partial<ProjectStateV2>): ProjectStateV2 {
  return {
    schema_version: PROJECT_STATE_SCHEMA_VERSION,
    strategy: {
      topic: "Test Topic",
      audience: null,
      audience_sophistication: null,
      primary_problem: null,
      pain_points: [],
      desired_outcome: null,
      core_promise: null,
      unique_angle: null,
      content_pillars: [],
      product_or_offer: null,
      funnel_goal: null,
      cta_goal: null,
      tone: null,
    },
    missing_fields: [...REQUIRED_STRATEGY_FIELDS],
    next_action: "continue_strategy",
    conversation_summary: null,
    updated_at: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

function fakeStrategistResult(overrides?: Partial<StrategistResult>): StrategistResult {
  return {
    assistant_message: "Hello, how can I help?",
    state_patch: {},
    readiness_score: 50,
    missing_fields: [],
    next_action: "continue_strategy",
    suggested_replies: [
      { label: "Yes", message: "Yes, go ahead.", intent: "confirm" },
      { label: "No", message: "No, let's change topic.", intent: "answer" },
    ],
    response_language: "en",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildAssistantMetadata", () => {
  // ---- Minimum test 1: Suggestions persisted ----

  it("includes suggested_replies from the strategist result", () => {
    const state = fakeState();
    const strategist = fakeStrategistResult({
      suggested_replies: [
        { label: "Interesting", message: "Tell me more", intent: "answer" },
      ],
    });

    const meta = buildAssistantMetadata(strategist, state);

    expect(meta.suggested_replies).toEqual([
      { label: "Interesting", message: "Tell me more", intent: "answer" },
    ]);
  });

  // ---- Minimum test 2: Empty suggestions persisted as empty array ----

  it("persists empty suggested_replies as empty array (never undefined)", () => {
    const state = fakeState();
    const strategist = fakeStrategistResult({ suggested_replies: [] });

    const meta = buildAssistantMetadata(strategist, state);

    expect(meta.suggested_replies).toEqual([]);
    expect(meta.suggested_replies).not.toBeUndefined();
  });

  // ---- Minimum test 3: Context timestamp equals mergedState.updated_at ----

  it("sets strategy_context_updated_at to mergedState.updated_at", () => {
    const state = fakeState({ updated_at: "2026-07-20T14:30:00.000Z" });
    const strategist = fakeStrategistResult();

    const meta = buildAssistantMetadata(strategist, state);

    expect(meta.strategy_context_updated_at).toBe("2026-07-20T14:30:00.000Z");
  });

  // ---- Test 4: response_language from strategistResult ----

  it("stores response_language from the strategist result", () => {
    const state = fakeState();

    const metaEn = buildAssistantMetadata(
      fakeStrategistResult({ response_language: "en" }),
      state,
    );
    expect(metaEn.response_language).toBe("en");

    const metaId = buildAssistantMetadata(
      fakeStrategistResult({ response_language: "id" }),
      state,
    );
    expect(metaId.response_language).toBe("id");
  });

  // ---- Extra: suggestion with a field reference ----

  it("preserves field references in suggested_replies", () => {
    const state = fakeState();
    const strategist = fakeStrategistResult({
      suggested_replies: [
        { label: "Business", message: "Business audience", field: "audience", intent: "answer" },
      ],
    });

    const meta = buildAssistantMetadata(strategist, state);

    expect(meta.suggested_replies).toHaveLength(1);
    expect(meta.suggested_replies![0]?.field).toBe("audience");
  });

  // ---- Extra: metadata shape is always a plain object ----

  it("returns a plain object (not null, not an array)", () => {
    const meta = buildAssistantMetadata(fakeStrategistResult(), fakeState());
    expect(typeof meta).toBe("object");
    expect(meta).not.toBeNull();
    expect(Array.isArray(meta)).toBe(false);
  });
});
