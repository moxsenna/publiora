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

function fallback(project: PlannerProject): PlannerResult {
  const base = [
    {
      title: "Konteks: kenapa topik ini penting sekarang",
      summary: "Pembingkaian masalah dan momentum audiens.",
      key_points: ["Tren pendukung", "Celah yang masih kosong", "Kaitan ke persona"],
    },
    {
      title: "Kerangka inti",
      summary: "Definisi operasional dan analogi konkret.",
      key_points: ["Definisi", "Analogi", "Batas/pengecualian"],
    },
    {
      title: "Sistem step-by-step",
      summary: "Urutan langkah taktis untuk audiens.",
      key_points: ["Prasyarat", "Urutan langkah", "Checkpoint"],
    },
    {
      title: "Pitfall & perbaikan",
      summary: "Kesalahan umum dan cara memperbaiki.",
      key_points: ["3 pitfall", "Sinyal dini", "Remedial"],
    },
    {
      title: "Ukur & lanjutkan",
      summary: "Metrik sukses dan loop berikutnya.",
      key_points: ["Leading metric", "Review ritme", "Resource lanjutan"],
    },
  ];
  return {
    title: project.title,
    description: `Outline untuk ${project.audience} · ${project.tone}`,
    sections: base.map((s, i) => ({
      id: `sec_${i + 1}_${rid()}`,
      position: i + 1,
      title: s.title,
      summary: s.summary,
      key_points: s.key_points,
      estimated_words: 700 + i * 50,
      status: "pending" as const,
    })),
  };
}

export async function runPlanner(project: PlannerProject): Promise<PlannerResult> {
  try {
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
    if (!result.sections?.length) return fallback(project);
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
  } catch (err) {
    console.error("[planner]", err);
    return fallback(project);
  }
}
