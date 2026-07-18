import type { AgentName } from "@/types/message";

export const AGENT_LABELS: Record<AgentName, string> = {
  strategist: "Strategist",
  planner: "Planner",
  writer: "Writer",
  enhancement: "Enhancement",
  title: "Title",
  cta: "CTA",
};

export const AGENT_COLORS: Record<AgentName, string> = {
  strategist: "#0A0A0A",
  planner: "#2563EB",
  writer: "#059669",
  enhancement: "#C8A24B",
  title: "#7C3AED",
  cta: "#DC2626",
};
