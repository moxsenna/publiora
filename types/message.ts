// AI chat messages inside a project workspace.

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
  agent?: AgentName;
}
