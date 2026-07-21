import { describe, expect, it } from "vitest";
import {
  normalizeStrategySuggestedReplies,
  resolveNumberedSuggestionInput,
} from "@/lib/ai/strategy-suggestions";
import type { StrategySuggestedReply } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reply(
  overrides: Partial<StrategySuggestedReply> = {},
): StrategySuggestedReply {
  return {
    label: "Default label",
    message: "Default message text here.",
    intent: "answer",
    ...overrides,
  };
}

const KNOWN_FIELDS = [
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
] as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("normalizeStrategySuggestedReplies", () => {
  // -- Valid 4 suggestions ---------------------------------------------------

  it("returns up to 4 valid suggestions unchanged", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "A", message: "msg A", field: "topic" }),
      reply({ label: "B", message: "msg B", intent: "confirm" }),
      reply({ label: "C", message: "msg C", field: "audience" }),
      reply({ label: "D", message: "msg D", intent: "clarify" }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.label)).toEqual(["A", "B", "C", "D"]);
  });

  // -- Empty suggestions -----------------------------------------------------

  it("returns empty array for empty input", () => {
    expect(normalizeStrategySuggestedReplies([], [])).toEqual([]);
  });

  it("returns empty array when all suggestions have empty labels", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "   ", message: "msg 1" }),
      reply({ label: "", message: "msg 2" }),
    ];
    expect(normalizeStrategySuggestedReplies(input, [])).toEqual([]);
  });

  // -- Duplicate suggestions -------------------------------------------------

  it("deduplicates case-insensitively on message, keeping first occurrence", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "A", message: "Hello World" }),
      reply({ label: "B", message: "hello world" }), // duplicate (case-insensitive)
      reply({ label: "C", message: "Unique" }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("A");
    expect(result[1].label).toBe("C");
  });

  it("deduplicates across the full list (not just adjacent)", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "First", message: "dup" }),
      reply({ label: "Unique", message: "unique" }),
      reply({ label: "Second", message: "DUP" }), // duplicate of first
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("First");
    expect(result[1].label).toBe("Unique");
  });

  // -- Unknown field rejected ------------------------------------------------

  it("discards suggestions with a field not in EbookStrategy keys", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "Good", message: "msg", field: "topic" }),
      reply({
        label: "Bad",
        message: "bad field",
        field: "not_a_real_field" as any,
      }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Good");
  });

  it("keeps suggestions with null or undefined field", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "A", message: "msg A", field: null }),
      reply({ label: "B", message: "msg B", field: undefined }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toHaveLength(2);
  });

  // -- Caps at 4 -------------------------------------------------------------

  it("caps at 4 suggestions", () => {
    const input: StrategySuggestedReply[] = [1, 2, 3, 4, 5, 6].map((n) =>
      reply({ label: `L${n}`, message: `message ${n}` }),
    );
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.label)).toEqual(["L1", "L2", "L3", "L4"]);
  });

  // -- Trimming --------------------------------------------------------------

  it("trims label and message whitespace", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "  hello  ", message: "  world  " }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result[0].label).toBe("hello");
    expect(result[0].message).toBe("world");
  });

  // -- Missing field prioritization ------------------------------------------

  it("sorts suggestions so those matching missing_fields come first", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "A", message: "topic help", field: "tone" }),
      reply({ label: "B", message: "audience help", field: "audience" }),
      reply({ label: "C", message: "general help", field: null }),
    ];
    const result = normalizeStrategySuggestedReplies(input, [
      "audience",
      "primary_problem",
    ]);
    // "B" (audience match) should come first; "A" and "C" after (stable relative)
    expect(result.map((r) => r.label)).toEqual(["B", "A", "C"]);
  });

  it("does not sort when missingFields is empty", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "A", message: "msg A", field: "tone" }),
      reply({ label: "B", message: "msg B", field: "audience" }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    // no reordering — original order preserved
    expect(result.map((r) => r.label)).toEqual(["A", "B"]);
  });

  // -- Preserves intent ------------------------------------------------------

  it("preserves the intent field unchanged", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "Ask", message: "ask msg", intent: "ask_recommendation" }),
      reply({ label: "Confirm", message: "confirm msg", intent: "confirm" }),
      reply({ label: "Clarify", message: "clarify msg", intent: "clarify" }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result.map((r) => r.intent)).toEqual([
      "ask_recommendation",
      "confirm",
      "clarify",
    ]);
  });

  // -- Does NOT invent/fabricate ---------------------------------------------

  it("does not add fallback suggestions when all are invalid", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "", message: "   " }),
      reply({
        label: "Bad field",
        message: "some",
        field: "imaginary" as any,
      }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toEqual([]);
  });

  // -- Empty label after trim ------------------------------------------------

  it("discards entries whose trimmed label is empty", () => {
    const input: StrategySuggestedReply[] = [
      reply({ label: "   ", message: "message 1" }),
      reply({ label: "\t\n", message: "message 2" }),
      reply({ label: "Ok", message: "message 3" }),
    ];
    const result = normalizeStrategySuggestedReplies(input, []);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Ok");
  });
});

// ---------------------------------------------------------------------------
// resolveNumberedSuggestionInput
// ---------------------------------------------------------------------------

describe("resolveNumberedSuggestionInput", () => {
  const suggestions: StrategySuggestedReply[] = [
    reply({ label: "A", message: "Pilih opsi A lengkap." }),
    reply({ label: "B", message: "Pilih opsi B lengkap." }),
    reply({ label: "C", message: "Pilih opsi C lengkap." }),
  ];

  it("maps 1-based digit to suggestion message", () => {
    expect(resolveNumberedSuggestionInput("1", suggestions)).toBe(
      "Pilih opsi A lengkap.",
    );
    expect(resolveNumberedSuggestionInput("2", suggestions)).toBe(
      "Pilih opsi B lengkap.",
    );
    expect(resolveNumberedSuggestionInput("3", suggestions)).toBe(
      "Pilih opsi C lengkap.",
    );
  });

  it("trims whitespace before matching digit", () => {
    expect(resolveNumberedSuggestionInput("  2  ", suggestions)).toBe(
      "Pilih opsi B lengkap.",
    );
  });

  it("returns free text when input is not a single digit 1-4", () => {
    expect(resolveNumberedSuggestionInput("SEO organik", suggestions)).toBe(
      "SEO organik",
    );
    expect(resolveNumberedSuggestionInput("12", suggestions)).toBe("12");
    expect(resolveNumberedSuggestionInput("0", suggestions)).toBe("0");
    expect(resolveNumberedSuggestionInput("5", suggestions)).toBe("5");
  });

  it("returns free text when digit exceeds suggestion count", () => {
    expect(resolveNumberedSuggestionInput("4", suggestions)).toBe("4");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(resolveNumberedSuggestionInput("   ", suggestions)).toBe("");
    expect(resolveNumberedSuggestionInput("", suggestions)).toBe("");
  });

  it("returns free text digit when suggestions empty", () => {
    expect(resolveNumberedSuggestionInput("1", [])).toBe("1");
  });
});
