import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ctaSuggestionSchema, ctaResponseSchema, normalizeCtas } from "./cta";
import { isValidCtaUrl } from "@/types/ai-suggestions";
import type { CtaSuggestion, CtaGoal } from "@/types/ai-suggestions";

// ---------------------------------------------------------------------------
// isValidCtaUrl
// ---------------------------------------------------------------------------

describe("isValidCtaUrl", () => {
  it("returns true for null", () => {
    expect(isValidCtaUrl(null)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidCtaUrl("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isValidCtaUrl("   ")).toBe(false);
  });

  it("returns true for valid https URL", () => {
    expect(isValidCtaUrl("https://example.com")).toBe(true);
  });

  it("returns true for valid http URL", () => {
    expect(isValidCtaUrl("http://example.com")).toBe(true);
  });

  it("returns true for URL with path and query", () => {
    expect(isValidCtaUrl("https://example.com/path?q=1&r=2")).toBe(true);
  });

  it("returns false for javascript: URL", () => {
    expect(isValidCtaUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns false for ftp: URL", () => {
    expect(isValidCtaUrl("ftp://server.com")).toBe(false);
  });

  it("returns false for random text", () => {
    expect(isValidCtaUrl("not a url")).toBe(false);
  });

  it("returns false for undefined", () => {
    // Undefined is not null, so it should be caught as invalid
    // But the function signature expects string | null
    // Test with coercion
    expect(isValidCtaUrl(undefined as unknown as string | null)).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(isValidCtaUrl("  https://example.com  ")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ctaSuggestionSchema (Zod)
// ---------------------------------------------------------------------------

describe("ctaSuggestionSchema", () => {
  it("parses a valid suggestion", () => {
    const input = {
      goal: "join_whatsapp",
      text: "Gabung komunitas WhatsApp sekarang!",
      placement: "ebook_end",
      rationale: "Direct call to join the community.",
    };
    const parsed = ctaSuggestionSchema.parse(input);
    expect(parsed.goal).toBe("join_whatsapp");
    expect(parsed.text).toBe(input.text);
  });

  it("rejects invalid goal", () => {
    expect(() =>
      ctaSuggestionSchema.parse({
        goal: "invalid_goal",
        text: "Click here",
        placement: "ebook_end",
        rationale: "Bad",
      }),
    ).toThrow(z.ZodError);
  });

  it("rejects empty text", () => {
    expect(() =>
      ctaSuggestionSchema.parse({
        goal: "custom",
        text: "",
        placement: "claim_page",
        rationale: "Bad",
      }),
    ).toThrow(z.ZodError);
  });

  it("rejects empty rationale", () => {
    expect(() =>
      ctaSuggestionSchema.parse({
        goal: "buy_product",
        text: "Beli sekarang!",
        placement: "both",
        rationale: "",
      }),
    ).toThrow(z.ZodError);
  });

  it("rejects invalid placement", () => {
    expect(() =>
      ctaSuggestionSchema.parse({
        goal: "follow_creator",
        text: "Follow",
        placement: "header",
        rationale: "Bad placement",
      }),
    ).toThrow(z.ZodError);
  });

  it("accepts all valid goals", () => {
    const goals: CtaGoal[] = [
      "visit_product",
      "join_whatsapp",
      "claim_bonus",
      "buy_product",
      "follow_creator",
      "custom",
    ];
    for (const goal of goals) {
      const result = ctaSuggestionSchema.parse({
        goal,
        text: `CTA for ${goal}`,
        placement: "ebook_end",
        rationale: "Works",
      });
      expect(result.goal).toBe(goal);
    }
  });

  it("accepts all valid placements", () => {
    const placements = ["ebook_end", "claim_page", "both"] as const;
    for (const placement of placements) {
      const result = ctaSuggestionSchema.parse({
        goal: "custom",
        text: "CTA",
        placement,
        rationale: "Works",
      });
      expect(result.placement).toBe(placement);
    }
  });
});

// ---------------------------------------------------------------------------
// ctaResponseSchema (Zod)
// ---------------------------------------------------------------------------

describe("ctaResponseSchema", () => {
  it("parses a valid response", () => {
    const input = {
      suggestions: [
        {
          goal: "join_whatsapp",
          text: "Gabung sekarang!",
          placement: "ebook_end",
          rationale: "Direct WhatsApp join.",
        },
        {
          goal: "join_whatsapp",
          text: "Klik untuk join komunitas",
          placement: "ebook_end",
          rationale: "Community angle.",
        },
      ],
    };
    const parsed = ctaResponseSchema.parse(input);
    expect(parsed.suggestions).toHaveLength(2);
  });

  it("rejects empty suggestions array", () => {
    expect(() =>
      ctaResponseSchema.parse({ suggestions: [] }),
    ).toThrow(z.ZodError);
  });

  it("rejects missing suggestions key", () => {
    expect(() =>
      ctaResponseSchema.parse({}),
    ).toThrow(z.ZodError);
  });

  it("rejects when a suggestion is invalid", () => {
    expect(() =>
      ctaResponseSchema.parse({
        suggestions: [{ goal: "bad", text: "", placement: "bad", rationale: "" }],
      }),
    ).toThrow(z.ZodError);
  });
});

// ---------------------------------------------------------------------------
// normalizeCtas
// ---------------------------------------------------------------------------

describe("normalizeCtas", () => {
  it("returns empty array for empty input", () => {
    const result = normalizeCtas([], "custom", "ebook_end");
    expect(result).toEqual([]);
  });

  it("forces goal and placement to match request", () => {
    const input: CtaSuggestion[] = [
      {
        goal: "buy_product",
        text: "Buy now!",
        placement: "claim_page",
        rationale: "Purchase CTA.",
      },
    ];
    const result = normalizeCtas(input, "join_whatsapp", "ebook_end");
    expect(result).toHaveLength(1);
    expect(result[0].goal).toBe("join_whatsapp");
    expect(result[0].placement).toBe("ebook_end");
    expect(result[0].text).toBe("Buy now!");
  });

  it("deduplicates by normalized text", () => {
    const input: CtaSuggestion[] = [
      {
        goal: "follow_creator",
        text: "Follow us!",
        placement: "ebook_end",
        rationale: "A",
      },
      {
        goal: "follow_creator",
        text: "  FOLLOW US!  ",
        placement: "ebook_end",
        rationale: "B",
      },
      {
        goal: "follow_creator",
        text: "Follow Us!",
        placement: "ebook_end",
        rationale: "C",
      },
    ];
    const result = normalizeCtas(input, "follow_creator", "ebook_end");
    // All three normalize to "follow us!"
    expect(result).toHaveLength(1);
    expect(result[0].rationale).toBe("A"); // first wins
  });

  it("trims whitespace from text and rationale", () => {
    const input: CtaSuggestion[] = [
      {
        goal: "custom",
        text: "  hello world  ",
        placement: "claim_page",
        rationale: "  some reason  ",
      },
    ];
    const result = normalizeCtas(input, "custom", "claim_page");
    expect(result[0].text).toBe("hello world");
    expect(result[0].rationale).toBe("some reason");
  });

  it("caps at 6 suggestions", () => {
    const input: CtaSuggestion[] = Array.from({ length: 10 }, (_, i) => ({
      goal: "custom" as CtaGoal,
      text: `Option ${i}`,
      placement: "both" as const,
      rationale: `Reason ${i}`,
    }));
    const result = normalizeCtas(input, "custom", "both");
    expect(result).toHaveLength(6);
  });

  it("preserves order of first occurrence", () => {
    const input: CtaSuggestion[] = [
      {
        goal: "custom",
        text: "First",
        placement: "ebook_end",
        rationale: "R1",
      },
      {
        goal: "custom",
        text: "Second",
        placement: "ebook_end",
        rationale: "R2",
      },
      {
        goal: "custom",
        text: "First",
        placement: "ebook_end",
        rationale: "Duplicate",
      },
      {
        goal: "custom",
        text: "Third",
        placement: "ebook_end",
        rationale: "R3",
      },
    ];
    const result = normalizeCtas(input, "custom", "ebook_end");
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe("First");
    expect(result[1].text).toBe("Second");
    expect(result[2].text).toBe("Third");
  });
});
