import { completeJson } from "@/lib/ai/provider";
import { PLANNER_SYSTEM } from "@/lib/ai/prompts";
import type { OutlineSection } from "@/types/outline";

export type PlannerProject = {
  title: string;
  description: string;
  audience: string;
  tone: string;
  niche: string;
};

export type PlannerResult = {
  title: string;
  description: string;
  sections: OutlineSection[];
};

function rid(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function runPlanner(project: PlannerProject): Promise<PlannerResult> {
  const user = `Build outline for:
title: ${project.title}
description: ${project.description}
audience: ${project.audience}
tone: ${project.tone}
niche: ${project.niche}

Return 5-7 sections.`;
  const result = await completeJson<PlannerResult>({
    system: PLANNER_SYSTEM,
    user,
  });
  if (!result.sections?.length) {
    throw new Error("Planner returned no sections");
  }
  const sections = result.sections.slice(0, 10).map((s, i) => ({
    id: s.id || `sec_${i + 1}_${rid()}`,
    position: i + 1,
    title: s.title || `Section ${i + 1}`,
    summary: s.summary || "",
    key_points: Array.isArray(s.key_points) ? s.key_points.slice(0, 6) : [],
    estimated_words: s.estimated_words || 700,
    status: "pending" as const,
  }));
  return {
    title: result.title || project.title,
    description: result.description || "",
    sections,
  };
}
