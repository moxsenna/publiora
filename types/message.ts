// AI chat messages inside a project workspace.
import type { ProjectStateV2, StrategyNextAction } from "./strategy";

export type MessageRole = "user" | "assistant" | "system";

export type AgentName =
  | "strategist"
  | "planner"
  | "writer"
  | "enhancement"
  | "title"
  | "cta";

export interface ChatMessage {
  id: string;
  project_id: string;
  role: MessageRole;
  content: string;
  agent: AgentName | null;
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
