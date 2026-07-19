import { describe, expect, it } from "vitest";
import {
  chatBodySchema,
  strategyPatchSchema,
} from "@/lib/validations/strategy";

// ---------------------------------------------------------------------------
// chatBodySchema
// ---------------------------------------------------------------------------

describe("chatBodySchema", () => {
  it("accepts non-empty content", () => {
    const result = chatBodySchema.safeParse({ content: "Help me refine topic" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Help me refine topic");
    }
  });

  it("trims content", () => {
    const result = chatBodySchema.safeParse({ content: "  hello  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("hello");
    }
  });

  it("rejects empty content", () => {
    const result = chatBodySchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("content is required");
    }
  });

  it("rejects whitespace-only content", () => {
    const result = chatBodySchema.safeParse({ content: "   \n\t  " });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = chatBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects content longer than 4000 chars", () => {
    const result = chatBodySchema.safeParse({ content: "x".repeat(4001) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("content too long");
    }
  });
});

// ---------------------------------------------------------------------------
// strategyPatchSchema
// ---------------------------------------------------------------------------

describe("strategyPatchSchema", () => {
  it("accepts a valid partial strategy_patch", () => {
    const result = strategyPatchSchema.safeParse({
      strategy_patch: {
        topic: "Instagram growth",
        audience: null,
        pain_points: ["low reach"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty strategy_patch object", () => {
    const result = strategyPatchSchema.safeParse({ strategy_patch: {} });
    expect(result.success).toBe(true);
  });

  it("rejects unknown keys on strategy_patch (strict)", () => {
    const result = strategyPatchSchema.safeParse({
      strategy_patch: {
        topic: "ok",
        unknown_field: "nope",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing strategy_patch", () => {
    const result = strategyPatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid body types", () => {
    const result = strategyPatchSchema.safeParse({
      strategy_patch: "not-an-object",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array pain_points", () => {
    const result = strategyPatchSchema.safeParse({
      strategy_patch: { pain_points: "oops" },
    });
    expect(result.success).toBe(false);
  });
});
