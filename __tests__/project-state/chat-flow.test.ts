import { describe, expect, it } from "vitest";
import {
  MAX_CHAT_HISTORY,
  buildChatHistoryForStrategist,
  planChatPersistence,
  shouldPersistAfterStrategist,
} from "@/lib/project-state/chat-flow";

// ---------------------------------------------------------------------------
// buildChatHistoryForStrategist — true recent N (newest-first input)
// ---------------------------------------------------------------------------

describe("buildChatHistoryForStrategist", () => {
  it("reverses newest-first rows to chronological order", () => {
    const newestFirst = [
      { role: "assistant", content: "msg3" },
      { role: "user", content: "msg2" },
      { role: "assistant", content: "msg1" },
    ];
    const history = buildChatHistoryForStrategist(newestFirst);
    expect(history.map((h) => h.content)).toEqual(["msg1", "msg2", "msg3"]);
  });

  it("keeps only the first `limit` rows (newest window) before reverse", () => {
    // Simulate DB: order desc, limit already applied would be 2 newest
    const newestFirst = [
      { role: "user", content: "newest" },
      { role: "assistant", content: "mid" },
      { role: "user", content: "oldest-in-batch" },
    ];
    const history = buildChatHistoryForStrategist(newestFirst, 2);
    expect(history.map((h) => h.content)).toEqual(["mid", "newest"]);
  });

  it("returns empty array for empty input", () => {
    expect(buildChatHistoryForStrategist([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const newestFirst = [
      { role: "user", content: "b" },
      { role: "user", content: "a" },
    ];
    const copy = newestFirst.map((r) => ({ ...r }));
    buildChatHistoryForStrategist(newestFirst);
    expect(newestFirst).toEqual(copy);
  });

  it("defaults limit to MAX_CHAT_HISTORY", () => {
    expect(MAX_CHAT_HISTORY).toBe(20);
    const rows = Array.from({ length: 25 }, (_, i) => ({
      role: "user",
      content: `m${i}`,
    }));
    // index 0 = newest
    const history = buildChatHistoryForStrategist(rows);
    expect(history).toHaveLength(20);
    expect(history[0]?.content).toBe("m19");
    expect(history[19]?.content).toBe("m0");
  });
});

// ---------------------------------------------------------------------------
// AI failure path — no state upsert / no message inserts
// ---------------------------------------------------------------------------

describe("planChatPersistence / shouldPersistAfterStrategist", () => {
  it("AI failure path does not allow persist (no state upsert)", () => {
    const plan = planChatPersistence(false);
    expect(plan).toEqual({ persist: false, reason: "ai_failed" });
    expect(shouldPersistAfterStrategist(false)).toBe(false);
  });

  it("AI success path allows persist (user msg + state + assistant)", () => {
    const plan = planChatPersistence(true);
    expect(plan).toEqual({ persist: true, reason: "ai_succeeded" });
    expect(shouldPersistAfterStrategist(true)).toBe(true);
  });
});

// merge still covered by __tests__/project-state/normalize.test.ts
