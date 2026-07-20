// AI chat messages inside a project workspace.
import type { ProjectStateV2, StrategyNextAction, StrategySuggestedReply } from "./strategy";

export type MessageRole = "user" | "assistant" | "system";

export type AgentName =
  | "strategist"
  | "planner"
  | "writer"
  | "enhancement"
  | "title"
  | "cta";

export interface ChatMessageMetadata {
  suggested_replies?: StrategySuggestedReply[];
  strategy_context_updated_at?: string;
  response_language?: "id" | "en";
}

/**
 * Type guard for ChatMessageMetadata.
 * Returns true when `value` is a non-null object whose optional
 * `suggested_replies` (if present) is an array.
 */
export function isChatMessageMetadata(value: unknown): value is ChatMessageMetadata {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  if ("suggested_replies" in m && m.suggested_replies !== undefined) {
    if (!Array.isArray(m.suggested_replies)) return false;
  }
  return true;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: MessageRole;
  content: string;
  agent: AgentName | null;
  metadata: ChatMessageMetadata;
  created_at: string;
}

export interface SendMessageInput {
  project_id: string;
  content: string;
}

/** Response shape for POST /api/projects/[id]/chat */
export interface ChatResponse {
  message: ChatMessage;
  state: ProjectStateV2;
  readiness_score: number;
  next_action: StrategyNextAction;
  missing_fields: string[];
}
