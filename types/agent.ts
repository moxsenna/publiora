// AI agent metadata — internal to generation, surfaced in chat + outline.

export type AgentSlug = "strategist" | "planner" | "writer" | "enhancement" | "title";

export interface AgentMeta {
  slug: string;
  name: string;
  description: string;
  color: string;
}
