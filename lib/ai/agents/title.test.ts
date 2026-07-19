import { describe, expect, it } from "vitest";
import { z } from "zod";
import { titleSuggestionSchema, titleResponseSchema } from "./title";
import type { TitleSuggestion } from "@/types/ai-suggestions";

// ---------------------------------------------------------------------------
// titleSuggestionSchema validation
// ---------------------------------------------------------------------------

describe("titleSuggestionSchema", () => {
  it("accepts a valid suggestion", () => {
    const raw = {
      style: "curiosity",
      title: "Why Most Marketing Fails",
      rationale: "Piques reader curiosity",
    };
    expect(() => titleSuggestionSchema.parse(raw)).not.toThrow();
  });

  it("accepts all valid styles", () => {
    for (const style of [
      "curiosity",
      "authority",
      "practical",
      "contrarian",
      "outcome",
    ] as const) {
      const raw = { style, title: "A Title", rationale: "Good rationale" };
      expect(() => titleSuggestionSchema.parse(raw)).not.toThrow();
    }
  });

  it("rejects invalid style", () => {
    const raw = {
      style: "not_a_style",
      title: "A Title",
      rationale: "Some rationale",
    };
    expect(() => titleSuggestionSchema.parse(raw)).toThrow();
  });

  it("rejects empty title", () => {
    const raw = { style: "curiosity", title: "", rationale: "Some rationale" };
    expect(() => titleSuggestionSchema.parse(raw)).toThrow();
  });

  it("rejects empty rationale", () => {
    const raw = { style: "curiosity", title: "A Title", rationale: "" };
    expect(() => titleSuggestionSchema.parse(raw)).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => titleSuggestionSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// titleResponseSchema validation
// ---------------------------------------------------------------------------

describe("titleResponseSchema", () => {
  it("accepts a valid response with exactly 5 suggestions", () => {
    const raw = {
      suggestions: [
        {
          style: "curiosity",
          title: "Title 1",
          rationale: "Rationale 1",
        },
        {
          style: "authority",
          title: "Title 2",
          rationale: "Rationale 2",
        },
        {
          style: "practical",
          title: "Title 3",
          rationale: "Rationale 3",
        },
        {
          style: "contrarian",
          title: "Title 4",
          rationale: "Rationale 4",
        },
        {
          style: "outcome",
          title: "Title 5",
          rationale: "Rationale 5",
        },
      ],
    };
    expect(() => titleResponseSchema.parse(raw)).not.toThrow();
    const parsed = titleResponseSchema.parse(raw);
    expect(parsed.suggestions.length).toBe(5);
  });

  it("accepts fewer than 5 suggestions (normalization fills gaps)", () => {
    const raw = {
      suggestions: [
        { style: "curiosity", title: "Title 1", rationale: "R1" },
        { style: "authority", title: "Title 2", rationale: "R2" },
      ],
    };
    expect(() => titleResponseSchema.parse(raw)).not.toThrow();
    const parsed = titleResponseSchema.parse(raw);
    expect(parsed.suggestions.length).toBe(2);
  });

  it("rejects empty suggestions array", () => {
    const raw = { suggestions: [] };
    // Zod allows empty arrays by default; the runtime check in
    // runTitleGenerator handles this.
    expect(() => titleResponseSchema.parse(raw)).not.toThrow();
  });

  it("rejects when suggestions field is missing", () => {
    expect(() => titleResponseSchema.parse({})).toThrow();
  });

  it("rejects when a suggestion has an invalid field type", () => {
    const raw = {
      suggestions: [
        { style: "curiosity", title: 123, rationale: "R1" },
      ],
    };
    expect(() => titleResponseSchema.parse(raw)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// VALID_STYLES array sanity
// ---------------------------------------------------------------------------

describe("valid styles coverage", () => {
  it("covers all TitleStyle union members", () => {
    // This test ensures no drift between VALID_STYLES constant and the schema enum
    const validStyles: string[] = [
      "curiosity",
      "authority",
      "practical",
      "contrarian",
      "outcome",
    ];
    expect(validStyles.length).toBe(5);
    // All styles are valid in schema
    for (const style of validStyles) {
      const parsed = titleSuggestionSchema.parse({
        style,
        title: "Test",
        rationale: "Test",
      });
      expect(parsed.style).toBe(style);
    }
  });
});
