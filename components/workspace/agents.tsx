import type { AgentName } from "@/types/message";
import type { AgentMeta } from "@/types/agent";

export const AGENTS: (AgentMeta & { slug: AgentName })[] = [
  { slug: "strategist", name: "Strategist", description: "Membentuk pillar dan angle", color: "#0A0A0A" },
  { slug: "planner", name: "Planner", description: "Outline & struktur", color: "#2563EB" },
  { slug: "writer", name: "Writer", description: "Tulis per section", color: "#059669" },
  { slug: "enhancement", name: "Enhancement", description: "Perbaiki draft", color: "#C8A24B" },
  { slug: "title", name: "Title", description: "Variasi judul", color: "#7C3AED" },
  { slug: "cta", name: "CTA", description: "Variasi CTA", color: "#DC2626" },
];
