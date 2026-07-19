// Pure helpers for strategist chat route: recent history + persist policy.

export const MAX_CHAT_HISTORY = 20;

export type ChatHistoryRow = {
  role: string;
  content: string;
};

/**
 * Build chronological strategist history from newest-first DB rows.
 *
 * Query pattern (true recent N):
 *   .order("created_at", { ascending: false }).limit(MAX_CHAT_HISTORY)
 *
 * Then reverse so oldest of the window comes first for the model.
 * Does not include the in-flight userMessage — pass that separately to runStrategist.
 */
export function buildChatHistoryForStrategist(
  newestFirstRows: ReadonlyArray<ChatHistoryRow>,
  limit: number = MAX_CHAT_HISTORY,
): ChatHistoryRow[] {
  const window = newestFirstRows.slice(0, Math.max(0, limit));
  return window
    .slice()
    .reverse()
    .map((row) => ({
      role: row.role,
      content: row.content,
    }));
}

export type ChatPersistPlan =
  | { persist: false; reason: "ai_failed" }
  | { persist: true; reason: "ai_succeeded" };

/**
 * Preferred chat flow: only insert user/assistant messages and upsert state
 * after strategist succeeds. On AI failure leave DB unchanged (no orphan user msg).
 */
export function planChatPersistence(aiSucceeded: boolean): ChatPersistPlan {
  if (!aiSucceeded) {
    return { persist: false, reason: "ai_failed" };
  }
  return { persist: true, reason: "ai_succeeded" };
}

/** True when route should insert messages + upsert project_states. */
export function shouldPersistAfterStrategist(aiSucceeded: boolean): boolean {
  return planChatPersistence(aiSucceeded).persist;
}
