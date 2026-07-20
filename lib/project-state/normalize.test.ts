import { describe, expect, it } from "vitest";
import {
  createEmptyProjectState,
  normalizeProjectState,
  mergeProjectState,
  computeMissingFields,
  clampReadinessScore,
  computeDeterministicReadinessScore,
} from "@/lib/project-state/normalize";
import type { EbookStrategy, StrategistResult, ProjectStateV2 } from "@/types/strategy";

// ---------------------------------------------------------------------------
// createEmptyProjectState
// ---------------------------------------------------------------------------

describe("createEmptyProjectState", () => {
  it("returns a valid V3 state with all null/empty fields", () => {
    const s = createEmptyProjectState();
    expect(s.schema_version).toBe(3);
    expect(s.strategy.topic).toBeNull();
    expect(s.strategy.audience).toBeNull();
    expect(s.strategy.primary_problem).toBeNull();
    expect(s.strategy.desired_outcome).toBeNull();
    expect(s.strategy.core_promise).toBeNull();
    expect(s.strategy.unique_angle).toBeNull();
    expect(s.strategy.pain_points).toEqual([]);
    expect(s.strategy.content_pillars).toEqual([]);
    expect(s.strategy.tone).toBeNull();
    expect(s.strategy.cta_goal).toBeNull();
    expect(s.missing_fields.length).toBeGreaterThan(0);
    expect(s.next_action).toBe("continue_strategy");
    expect(s.conversation_summary).toBeNull();
    expect(s.updated_at).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// normalizeProjectState
// ---------------------------------------------------------------------------

describe("normalizeProjectState", () => {
  it("empty legacy state normalises safely (null/undefined)", () => {
    const s = normalizeProjectState(null);
    expect(s.schema_version).toBe(3);
    expect(s.strategy.topic).toBeNull();
  });

  it("empty object normalises safely", () => {
    const s = normalizeProjectState({});
    expect(s.schema_version).toBe(3);
  });

  it("existing valid legacy fields are retained", () => {
    const raw = {
      topic: "My Ebook",
      audience: "Beginners",
      primary_problem: "Lack of focus",
      desired_outcome: "Clarity",
      core_promise: "A system",
      unique_angle: "Personal story",
      pain_points: ["pain 1", "pain 2"],
      content_pillars: ["pillar a"],
      tone: "friendly",
    traffic_source: null,
    bonus_role: null,
    usage_moment: null,
    sales_positioning: null,
    buyer_objections: [],
    };
    const s = normalizeProjectState(raw);
    expect(s.strategy.topic).toBe("My Ebook");
    expect(s.strategy.audience).toBe("Beginners");
    expect(s.strategy.primary_problem).toBe("Lack of focus");
    expect(s.strategy.desired_outcome).toBe("Clarity");
    expect(s.strategy.core_promise).toBe("A system");
    expect(s.strategy.unique_angle).toBe("Personal story");
    expect(s.strategy.pain_points).toEqual(["pain 1", "pain 2"]);
    expect(s.strategy.content_pillars).toEqual(["pillar a"]);
    expect(s.strategy.tone).toBe("friendly");
  });

  it("nested V2 strategy is preferred over top-level legacy fields", () => {
    const raw = {
      // legacy top-level
      topic: "Legacy Topic",
      strategy: {
        topic: "Nested Topic",
        audience: "Tech",
      },
    };
    const s = normalizeProjectState(raw);
    // nested strategy keys are preferred
    expect(s.strategy.topic).toBe("Nested Topic");
    expect(s.strategy.audience).toBe("Tech");
  });

  it("unknown keys are discarded", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      foo: "bar",
      bogus: 123,
    };
    const s = normalizeProjectState(raw);
    expect((s as unknown as Record<string, unknown>).foo).toBeUndefined();
    expect((s as unknown as Record<string, unknown>).bogus).toBeUndefined();
  });

  it("trim strings", () => {
    const raw = {
      topic: "   Trim Me   ",
      audience: "   Listeners   ",
      primary_problem: "   Problem   ",
      desired_outcome: "   Outcome   ",
      core_promise: "   Promise   ",
      unique_angle: "   Angle   ",
    };
    const s = normalizeProjectState(raw);
    expect(s.strategy.topic).toBe("Trim Me");
    expect(s.strategy.audience).toBe("Listeners");
  });

  it("blank strings become null", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      tone: "   ",
    traffic_source: null,
    bonus_role: null,
    usage_moment: null,
    sales_positioning: null,
    buyer_objections: [],
      product_or_offer: "",
    };
    const s = normalizeProjectState(raw);
    expect(s.strategy.tone).toBeNull();
    expect(s.strategy.product_or_offer).toBeNull();
  });

  it("removes blank array items and duplicates", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      pain_points: ["a", "", "b", "a", "  ", "b"],
      content_pillars: ["x", "x", "", "y"],
    };
    const s = normalizeProjectState(raw);
    expect(s.strategy.pain_points).toEqual(["a", "b"]);
    expect(s.strategy.content_pillars).toEqual(["x", "y"]);
  });

  it("non-array for array field yields empty array", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      pain_points: "not-an-array",
      content_pillars: 42,
    };
    const s = normalizeProjectState(raw);
    expect(s.strategy.pain_points).toEqual([]);
    expect(s.strategy.content_pillars).toEqual([]);
  });

  it("invalid AI keys are discarded (non-object raw)", () => {
    const s = normalizeProjectState("garbage");
    expect(s.schema_version).toBe(3);
    expect(s.strategy.topic).toBeNull();
  });

  it("next_action from raw is validated and falls back", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      funnel_goal: "collect_email",
      next_action: "invalid_action",
    };
    const s = normalizeProjectState(raw, "lead_magnet");
    // all required fields present => should fall back to create_outline
    expect(s.next_action).toBe("create_outline");
  });

  it("valid next_action is preserved", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      next_action: "review_outline",
    };
    const s = normalizeProjectState(raw);
    expect(s.next_action).toBe("review_outline");
  });

  it("updated_at is not trusted from input; regenerated", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      updated_at: "2000-01-01T00:00:00.000Z",
    };
    const before = new Date().toISOString();
    const s = normalizeProjectState(raw);
    const after = new Date().toISOString();
    expect(s.updated_at).not.toBe("2000-01-01T00:00:00.000Z");
    // updated_at should be >= before and <= after
    expect(s.updated_at >= before).toBe(true);
    expect(s.updated_at <= after).toBe(true);
  });

  it("schema_version is always 2", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      schema_version: 1,
    };
    const s = normalizeProjectState(raw);
    expect(s.schema_version).toBe(3);
  });

  it("conversation_summary is preserved when present", () => {
    const raw = {
      topic: "T",
      audience: "A",
      primary_problem: "P",
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      conversation_summary: "Hello world",
    };
    const s = normalizeProjectState(raw);
    expect(s.conversation_summary).toBe("Hello world");
  });
});

// ---------------------------------------------------------------------------
// mergeProjectState
// ---------------------------------------------------------------------------

describe("mergeProjectState", () => {
  const fullStrategy: EbookStrategy = {
    topic: "My Ebook",
    audience: "Developers",
    audience_sophistication: "Intermediate",
    primary_problem: "Scaling issues",
    pain_points: ["latency", "errors"],
    desired_outcome: "High availability",
    core_promise: "Reliable systems",
    unique_angle: "Personal experience",
    content_pillars: ["monitoring", "resilience"],
    product_or_offer: "Consulting",
    funnel_goal: "Lead generation",
    cta_goal: "visit_product",
    tone: "professional",
  traffic_source: null,
  bonus_role: null,
  usage_moment: null,
  sales_positioning: null,
  buyer_objections: [],
  };

  const fullState: ProjectStateV2 = {
    schema_version: 3,
    strategy: fullStrategy,
    missing_fields: [],
    next_action: "create_outline",
    conversation_summary: "Initial setup",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const emptyResult: StrategistResult = {
    assistant_message: "",
    state_patch: {},
    readiness_score: 0,
    missing_fields: [],
    next_action: "continue_strategy",
    suggested_replies: [],
    response_language: "id",
  };

  it("partial patch does not delete unrelated fields", () => {
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: { tone: "casual" },
      readiness_score: 80,
      next_action: "start_writing",
    };
    const merged = mergeProjectState(fullState, result);
    expect(merged.strategy.tone).toBe("casual");
    // Unrelated fields unchanged
    expect(merged.strategy.topic).toBe("My Ebook");
    expect(merged.strategy.audience).toBe("Developers");
    expect(merged.strategy.primary_problem).toBe("Scaling issues");
    expect(merged.strategy.pain_points).toEqual(["latency", "errors"]);
    expect(merged.strategy.content_pillars).toEqual(["monitoring", "resilience"]);
  });

  it("explicit null clears a scalar", () => {
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: { tone: null as unknown as string },  // null clears
      next_action: "continue_strategy",
    };
    const merged = mergeProjectState(fullState, result);
    expect(merged.strategy.tone).toBeNull();
  });

  it("explicit undefined in patch leaves existing value intact", () => {
    const orig = fullState.strategy.tone;
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: {},
      next_action: "continue_strategy",
    };
    const merged = mergeProjectState(fullState, result);
    expect(merged.strategy.tone).toBe(orig);
  });

  it("arrays replace and deduplicate", () => {
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: { pain_points: ["new", "new", "more"] },
      next_action: "continue_strategy",
    };
    const merged = mergeProjectState(fullState, result);
    expect(merged.strategy.pain_points).toEqual(["new", "more"]);
  });

  it("invalid AI keys are discarded", () => {
    const result = {
      assistant_message: "Hi",
      state_patch: { tone: "casual", bogus: "should not appear" },
      readiness_score: 80,
      missing_fields: [],
      next_action: "continue_strategy" as const,
      suggested_replies: [],
      response_language: "id",
    } as StrategistResult & { state_patch: Record<string, unknown> };
    const merged = mergeProjectState(fullState, result as StrategistResult);
    expect(merged.strategy.tone).toBe("casual");
    // bogus should not persist anywhere
    expect((merged.strategy as unknown as Record<string, unknown>).bogus).toBeUndefined();
  });

  it("readiness is clamped to 0..100", () => {
    expect(clampReadinessScore(150)).toBe(100);
    expect(clampReadinessScore(-5)).toBe(0);
    expect(clampReadinessScore(50)).toBe(50);
    expect(clampReadinessScore(NaN)).toBe(0);
    expect(clampReadinessScore(undefined)).toBe(0);
    expect(clampReadinessScore("80")).toBe(0);

    // merge still succeeds when readiness is out of range (not stored on state)
    const merged = mergeProjectState(fullState, {
      ...emptyResult,
      state_patch: {},
      readiness_score: 200,
      next_action: "continue_strategy",
    });
    expect(merged.missing_fields).toEqual([]);
  });

  it("merge preserves conversation_summary from current when not in patch", () => {
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: {},
      next_action: "continue_strategy",
      // no conversation_summary
    };
    const merged = mergeProjectState(fullState, result);
    expect(merged.conversation_summary).toBe("Initial setup");
  });

  it("merge overrides conversation_summary when provided", () => {
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: {},
      next_action: "continue_strategy",
      conversation_summary: "Updated summary",
    };
    const merged = mergeProjectState(fullState, result);
    expect(merged.conversation_summary).toBe("Updated summary");
  });

  it("merge regenerates updated_at", () => {
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: {},
      next_action: "continue_strategy",
    };
    const before = new Date().toISOString();
    const merged = mergeProjectState(fullState, result);
    const after = new Date().toISOString();
    expect(merged.updated_at).not.toBe("2025-01-01T00:00:00.000Z");
    expect(merged.updated_at >= before).toBe(true);
    expect(merged.updated_at <= after).toBe(true);
  });

  it("schema_version is always 3 after merge", () => {
    const result: StrategistResult = {
      ...emptyResult,
      state_patch: {},
      next_action: "continue_strategy",
    };
    const merged = mergeProjectState(fullState, result);
    expect(merged.schema_version).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeMissingFields
// ---------------------------------------------------------------------------

describe("computeMissingFields", () => {
  const full: EbookStrategy = {
    topic: "T",
    audience: "A",
    audience_sophistication: "Beginner",
    primary_problem: "P",
    pain_points: [],
    desired_outcome: "D",
    core_promise: "C",
    unique_angle: "U",
    content_pillars: [],
    product_or_offer: null,
    funnel_goal: "collect_email",
    cta_goal: null,
    tone: null,
    traffic_source: null,
    bonus_role: null,
    usage_moment: null,
    sales_positioning: null,
    buyer_objections: [],
  };

  it("returns empty array when all required fields present", () => {
    expect(computeMissingFields(full, "lead_magnet")).toEqual([]);
  });

  it("returns missing fields when required fields are null", () => {
    const s: EbookStrategy = { ...full, topic: null, audience: null };
    expect(computeMissingFields(s, "lead_magnet")).toEqual([
      "topic",
      "audience",
    ]);
  });

  it("returns missing fields for empty strings", () => {
    const s: EbookStrategy = { ...full, topic: "   " };
    expect(computeMissingFields(s, "lead_magnet")).toEqual(["topic"]);
  });

  it("product/cta optional for lead when funnel present", () => {
    const s: EbookStrategy = {
      ...full,
      product_or_offer: null,
      funnel_goal: "collect_email",
      cta_goal: null,
    };
    const missing = computeMissingFields(s, "lead_magnet");
    expect(missing).not.toContain("product_or_offer");
    expect(missing).not.toContain("cta_goal");
    expect(missing).not.toContain("funnel_goal");
  });

  it("lead magnet requires funnel_goal", () => {
    const s: EbookStrategy = { ...full, funnel_goal: null };
    expect(computeMissingFields(s, "lead_magnet")).toContain("funnel_goal");
  });

  it("bonus requires parent product, role, usage moment", () => {
    const s: EbookStrategy = {
      ...full,
      product_or_offer: null,
      bonus_role: null,
      usage_moment: null,
    };
    const missing = computeMissingFields(s, "bonus_product");
    expect(missing).toEqual(
      expect.arrayContaining([
        "product_or_offer",
        "bonus_role",
        "usage_moment",
      ]),
    );
  });

  it("sellable requires sales_positioning", () => {
    const s: EbookStrategy = { ...full, sales_positioning: null };
    expect(computeMissingFields(s, "sellable_ebook")).toContain(
      "sales_positioning",
    );
  });
});


describe("computeDeterministicReadinessScore", () => {
  it("scores incomplete strategy below 70", () => {
    const empty = {
      topic: null,
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
    traffic_source: null,
    bonus_role: null,
    usage_moment: null,
    sales_positioning: null,
    buyer_objections: [],
    };
    expect(computeDeterministicReadinessScore(empty)).toBe(0);
  });

  it("scores fully filled required fields at least 70", () => {
    const full = {
      topic: "T",
      audience: "A",
      audience_sophistication: "beginner",
      primary_problem: "P",
      pain_points: ["x"],
      desired_outcome: "D",
      core_promise: "C",
      unique_angle: "U",
      content_pillars: ["p1"],
      product_or_offer: "offer",
      funnel_goal: "join",
      cta_goal: "join_whatsapp",
      tone: "practical",
    traffic_source: null,
    bonus_role: null,
    usage_moment: null,
    sales_positioning: null,
    buyer_objections: [],
    };
    expect(computeDeterministicReadinessScore(full)).toBeGreaterThanOrEqual(70);
  });
});


describe("V2 → V3 migration", () => {
  it("upgrades legacy nested V2 state with empty V3 defaults", () => {
    const raw = {
      schema_version: 2,
      strategy: {
        topic: "Legacy topic",
        audience: "Legacy audience",
        primary_problem: "Problem",
        desired_outcome: "Outcome",
        core_promise: "Promise",
        unique_angle: "Angle",
      },
      next_action: "continue_strategy",
    };
    const s = normalizeProjectState(raw, "lead_magnet");
    expect(s.schema_version).toBe(3);
    expect(s.strategy.topic).toBe("Legacy topic");
    expect(s.strategy.traffic_source).toBeNull();
    expect(s.strategy.bonus_role).toBeNull();
    expect(s.strategy.usage_moment).toBeNull();
    expect(s.strategy.sales_positioning).toBeNull();
    expect(s.strategy.buyer_objections).toEqual([]);
    expect(s.missing_fields).toContain("funnel_goal");
  });
});
