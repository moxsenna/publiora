import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  aiStrategistResponseSchema,
  parseStrategistResponse,
} from "@/lib/ai/agents/strategist";
import type { StrategistResult } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid raw AI JSON payload. */
function validPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    assistant_message: "Here is a coaching reply.",
    state_patch: {},
    readiness_score: 42,
    missing_fields: [],
    next_action: "continue_strategy",
    conversation_summary: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// aiStrategistResponseSchema – direct Zod tests
// ---------------------------------------------------------------------------

describe("aiStrategistResponseSchema", () => {
  it("parses a valid full payload with all fields", () => {
    const raw = validPayload({
      assistant_message: "Your ebook positioning is solid.",
      state_patch: {
        topic: "Instagram growth for coaches",
        audience: "Life coaches with <500 followers",
        pain_points: ["no engagement", "algorithm mystery"],
      },
      readiness_score: 65,
      missing_fields: ["desired_outcome", "core_promise"],
      next_action: "continue_strategy",
      conversation_summary: "User shared Instagram pain points.",
    });

    const parsed = aiStrategistResponseSchema.parse(raw);
    expect(parsed.assistant_message).toBe("Your ebook positioning is solid.");
    expect(parsed.state_patch.topic).toBe("Instagram growth for coaches");
    expect(parsed.state_patch.pain_points).toEqual([
      "no engagement",
      "algorithm mystery",
    ]);
    expect(parsed.readiness_score).toBe(65);
    expect(parsed.missing_fields).toEqual(["desired_outcome", "core_promise"]);
    expect(parsed.next_action).toBe("continue_strategy");
    expect(parsed.conversation_summary).toBe(
      "User shared Instagram pain points.",
    );
  });

	it("fills defaults for missing optional fields", () => {
	    const raw = { assistant_message: "Minimal" };
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.state_patch).toEqual({});
	    expect(parsed.readiness_score).toBe(50);
	    expect(parsed.missing_fields).toEqual([]);
	    expect(parsed.next_action).toBe("continue_strategy");
	    expect(parsed.conversation_summary).toBeUndefined();
	    expect(parsed.suggested_replies).toEqual([]);
	    expect(parsed.response_language).toBe("id");
	  });

  it("rejects empty assistant_message", () => {
    const raw = validPayload({ assistant_message: "" });
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("rejects missing assistant_message", () => {
    const raw = validPayload();
    delete (raw as Record<string, unknown>).assistant_message;
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("rejects whitespace-only assistant_message", () => {
    const raw = validPayload({ assistant_message: "   " });
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("rejects invalid next_action value", () => {
    const raw = validPayload({ next_action: "invalid_action" });
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("rejects readiness_score below 0", () => {
    const raw = validPayload({ readiness_score: -1 });
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("rejects readiness_score above 100", () => {
    const raw = validPayload({ readiness_score: 101 });
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("accepts readiness_score at boundary 0", () => {
    const raw = validPayload({ readiness_score: 0 });
    const parsed = aiStrategistResponseSchema.parse(raw);
    expect(parsed.readiness_score).toBe(0);
  });

  it("accepts readiness_score at boundary 100", () => {
    const raw = validPayload({ readiness_score: 100 });
    const parsed = aiStrategistResponseSchema.parse(raw);
    expect(parsed.readiness_score).toBe(100);
  });

  it("strips unknown top-level keys silently (non-strict object)", () => {
    const raw = validPayload({ unknown_field: "should be gone" });
    const parsed = aiStrategistResponseSchema.parse(raw);
    expect((parsed as Record<string, unknown>).unknown_field).toBeUndefined();
  });

  it("strips unknown state_patch keys silently (non-strict object)", () => {
    const raw = validPayload({
      state_patch: { topic: "X", unknown_patch_key: "should be gone" },
    });
    const parsed = aiStrategistResponseSchema.parse(raw);
    expect(
      (parsed.state_patch as Record<string, unknown>).unknown_patch_key,
    ).toBeUndefined();
  });

  it("rejects non-string pain_points entries", () => {
    const raw = validPayload({
      state_patch: { pain_points: ["valid", 123 as unknown as string] },
    });
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("rejects non-string content_pillars entries", () => {
    const raw = validPayload({
      state_patch: {
        content_pillars: [null as unknown as string],
      },
    });
    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
  });

  it("accepts null for scalar state_patch fields", () => {
    const raw = validPayload({
      state_patch: { topic: null, audience: null },
    });
    const parsed = aiStrategistResponseSchema.parse(raw);
    expect(parsed.state_patch.topic).toBeNull();
    expect(parsed.state_patch.audience).toBeNull();
  });

  it("accepts all valid next_action values", () => {
	    const actions = [
	      "continue_strategy",
	      "create_outline",
	      "review_outline",
	      "start_writing",
	    ] as const;
	    for (const action of actions) {
	      const parsed = aiStrategistResponseSchema.parse(
	        validPayload({ next_action: action }),
	      );
	      expect(parsed.next_action).toBe(action);
	    }
	  });

	  // -- New: suggested_replies & response_language -------------------------

	  it("accepts valid suggested_replies with all required fields", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "Fix topic", message: "Let's narrow your topic", field: "topic", intent: "ask_recommendation" },
	        { label: "Confirm audience", message: "Is this the right audience?", field: "audience", intent: "confirm" },
	        { label: "Answer", message: "Thanks, that helps.", intent: "answer" },
	        { label: "Clarify", message: "What do you mean by that?", intent: "clarify" },
	      ],
	    });
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.suggested_replies).toHaveLength(4);
	    expect(parsed.suggested_replies[0].label).toBe("Fix topic");
	    expect(parsed.suggested_replies[0].message).toBe("Let's narrow your topic");
	    expect(parsed.suggested_replies[0].field).toBe("topic");
	    expect(parsed.suggested_replies[0].intent).toBe("ask_recommendation");
	  });

	  it("accepts empty suggested_replies array", () => {
	    const raw = validPayload({ suggested_replies: [] });
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.suggested_replies).toEqual([]);
	  });

	  it("defaults suggested_replies to empty array when missing", () => {
	    const raw = validPayload();
	    delete (raw as Record<string, unknown>).suggested_replies;
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.suggested_replies).toEqual([]);
	  });

	  it("rejects suggested_replies label longer than 48 characters", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "A".repeat(49), message: "valid", intent: "answer" },
	      ],
	    });
	    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
	  });

	  it("accepts suggested_replies label at exactly 48 characters", () => {
	    const label48 = "A".repeat(48);
	    const raw = validPayload({
	      suggested_replies: [
	        { label: label48, message: "valid", intent: "answer" },
	      ],
	    });
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.suggested_replies[0].label).toBe(label48);
	  });

	  it("rejects suggested_replies message longer than 240 characters", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "valid", message: "A".repeat(241), intent: "answer" },
	      ],
	    });
	    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
	  });

	  it("accepts suggested_replies message at exactly 240 characters", () => {
	    const msg240 = "A".repeat(240);
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "valid", message: msg240, intent: "answer" },
	      ],
	    });
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.suggested_replies[0].message).toBe(msg240);
	  });

	  it("rejects more than 4 suggested_replies", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "1", message: "m1" },
	        { label: "2", message: "m2" },
	        { label: "3", message: "m3" },
	        { label: "4", message: "m4" },
	        { label: "5", message: "m5" },
	      ],
	    });
	    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
	  });

	  it("defaults intent to answer when missing from suggested_reply", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "No intent", message: "message body" },
	      ],
	    });
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.suggested_replies[0].intent).toBe("answer");
	  });

	  it("rejects invalid intent value in suggested_reply", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "Bad", message: "msg", intent: "invalid_intent" },
	      ],
	    });
	    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
	  });

	  it("accepts null field in suggested_reply", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "General", message: "message", field: null, intent: "answer" },
	      ],
	    });
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.suggested_replies[0].field).toBeNull();
	  });

	  it("defaults response_language to id when missing", () => {
	    const raw = validPayload();
	    delete (raw as Record<string, unknown>).response_language;
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.response_language).toBe("id");
	  });

	  it("accepts response_language en", () => {
	    const raw = validPayload({ response_language: "en" });
	    const parsed = aiStrategistResponseSchema.parse(raw);
	    expect(parsed.response_language).toBe("en");
	  });

	  it("rejects invalid response_language", () => {
	    const raw = validPayload({ response_language: "fr" });
	    expect(() => aiStrategistResponseSchema.parse(raw)).toThrow(ZodError);
	  });
	});

// ---------------------------------------------------------------------------
// parseStrategistResponse – transformation wrapper tests
// ---------------------------------------------------------------------------

describe("parseStrategistResponse", () => {
  it("returns a valid StrategistResult for a full payload", () => {
    const raw = validPayload({
      assistant_message: "Coaching reply",
      state_patch: { topic: "Growth hacking" },
      readiness_score: 75,
      missing_fields: ["audience"],
      next_action: "continue_strategy",
      conversation_summary: "Discussed growth hacking.",
    });

    const result: StrategistResult = parseStrategistResponse(raw);
    expect(result.assistant_message).toBe("Coaching reply");
    expect(result.state_patch.topic).toBe("Growth hacking");
    expect(result.readiness_score).toBe(75);
    expect(result.missing_fields).toEqual(["audience"]);
    expect(result.next_action).toBe("continue_strategy");
    expect(result.conversation_summary).toBe("Discussed growth hacking.");
  });

  it("converts null/undefined scalar patch values to null", () => {
    const raw = validPayload({
      state_patch: { topic: null, audience: undefined },
    });
    const result = parseStrategistResponse(raw);
    expect(result.state_patch.topic).toBeNull();
    expect(result.state_patch.audience).toBeNull();
  });

  it("converts undefined array values to empty array", () => {
    const raw = validPayload({
      state_patch: { pain_points: undefined },
    });
    const result = parseStrategistResponse(raw);
    expect(result.state_patch.pain_points).toEqual([]);
  });

  it("converts missing conversation_summary to undefined", () => {
    const raw = validPayload();
    delete (raw as Record<string, unknown>).conversation_summary;
    const result = parseStrategistResponse(raw);
    expect(result.conversation_summary).toBeUndefined();
  });

  it("preserves null conversation_summary as null-ish (transformed to undefined)", () => {
    const raw = validPayload({ conversation_summary: null });
    const result = parseStrategistResponse(raw);
    expect(result.conversation_summary).toBeUndefined();
  });

  it("preserves non-null conversation_summary", () => {
    const raw = validPayload({ conversation_summary: "Summary here" });
    const result = parseStrategistResponse(raw);
    expect(result.conversation_summary).toBe("Summary here");
  });

  it("fails when assistant_message is missing", () => {
    const raw = validPayload();
    delete (raw as Record<string, unknown>).assistant_message;
    expect(() => parseStrategistResponse(raw)).toThrow(ZodError);
  });

	it("only includes keys present in state_patch (no phantom keys)", () => {
	    const raw = validPayload();
	    const result = parseStrategistResponse(raw);
	    // state_patch was empty object, so zero own keys
	    expect(Object.keys(result.state_patch)).toEqual([]);
	  });

	  // -- New: suggested_replies & response_language via parseStrategistResponse --

	  it("returns suggested_replies from valid payload", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "Fix", message: "Let's fix your topic", field: "topic", intent: "ask_recommendation" },
	      ],
	      response_language: "en",
	    });
	    const result = parseStrategistResponse(raw);
	    expect(result.suggested_replies).toHaveLength(1);
	    expect(result.suggested_replies[0].label).toBe("Fix");
	    expect(result.response_language).toBe("en");
	  });

	  it("returns empty suggested_replies and default response_language when missing", () => {
	    const raw = validPayload();
	    const result = parseStrategistResponse(raw);
	    expect(result.suggested_replies).toEqual([]);
	    expect(result.response_language).toBe("id");
	  });

	  it("applies normalizer dedupe on suggested_replies", () => {
	    const raw = validPayload({
	      suggested_replies: [
	        { label: "A", message: "Hello" },
	        { label: "B", message: "hello" }, // case-insensitive dupe
	      ],
	    });
	    const result = parseStrategistResponse(raw);
	    expect(result.suggested_replies).toHaveLength(1);
	    expect(result.suggested_replies[0].label).toBe("A");
	  });
	});
