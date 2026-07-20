import { describe, expect, it } from "vitest";
import { isChatMessageMetadata } from "@/types/message";

describe("isChatMessageMetadata", () => {
  // ---- Valid inputs ----

  it("accepts empty object {}", () => {
    expect(isChatMessageMetadata({})).toBe(true);
  });

  it("accepts object without suggested_replies (optional field)", () => {
    expect(
      isChatMessageMetadata({
        strategy_context_updated_at: "2026-07-20T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("accepts valid suggested_replies array", () => {
    expect(
      isChatMessageMetadata({
        suggested_replies: [
          { label: "Yes", message: "Go ahead", intent: "confirm" },
        ],
      }),
    ).toBe(true);
  });

  it("accepts empty suggested_replies array", () => {
    expect(
      isChatMessageMetadata({ suggested_replies: [] }),
    ).toBe(true);
  });

  it("accepts object with all known fields", () => {
    expect(
      isChatMessageMetadata({
        suggested_replies: [
          { label: "Ok", message: "Got it", intent: "answer" },
        ],
        strategy_context_updated_at: "2026-07-20T12:00:00.000Z",
        response_language: "id",
      }),
    ).toBe(true);
  });

  // ---- Invalid inputs ----

  it("rejects null", () => {
    expect(isChatMessageMetadata(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isChatMessageMetadata(undefined)).toBe(false);
  });

  it("rejects a string primitive", () => {
    expect(isChatMessageMetadata("hello")).toBe(false);
  });

  it("rejects a number primitive", () => {
    expect(isChatMessageMetadata(42)).toBe(false);
  });

  it("rejects a boolean", () => {
    expect(isChatMessageMetadata(true)).toBe(false);
  });

  it("rejects an array", () => {
    expect(isChatMessageMetadata([])).toBe(false);
  });

  it("rejects suggested_replies as a non-array string", () => {
    expect(
      isChatMessageMetadata({ suggested_replies: "nope" }),
    ).toBe(false);
  });

  it("rejects suggested_replies as a number", () => {
    expect(
      isChatMessageMetadata({ suggested_replies: 123 }),
    ).toBe(false);
  });

  it("rejects suggested_replies as null", () => {
    expect(
      isChatMessageMetadata({ suggested_replies: null }),
    ).toBe(false);
  });

  it("rejects suggested_replies as a plain object (not array)", () => {
    expect(
      isChatMessageMetadata({ suggested_replies: { label: "X" } }),
    ).toBe(false);
  });
});
