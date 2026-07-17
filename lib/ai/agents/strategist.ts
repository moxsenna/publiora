import { completeJson } from "@/lib/ai/provider";
import { STRATEGIST_SYSTEM } from "@/lib/ai/prompts";

export type StrategistInput = {
  project: {
    title: string;
    description: string;
    audience: string;
    tone: string;
    niche: string;
  };
  history: { role: string; content: string }[];
  userMessage: string;
};

export type StrategistResult = {
  assistant_message: string;
  state_patch?: Record<string, unknown>;
  readiness_score?: number;
};

function fallback(input: StrategistInput): StrategistResult {
  const p = input.project;
  return {
    assistant_message: `Saya baca brief "${p.title}" untuk audiens ${p.audience || "umum"} (tone: ${p.tone || "profesional"}).\n\nUsulan: fokus pada 3 pillar yang actionable, janji hasil yang terukur, dan CTA klaim ebook yang spesifik.\n\nPesan Anda: "${input.userMessage.slice(0, 200)}"\n\nKalau setuju, bilang "lanjut outline" — atau perjelas angle produk/audiens dulu.`,
    state_patch: {
      audience: p.audience,
      angle: p.niche,
    },
    readiness_score: 55,
  };
}

export async function runStrategist(
  input: StrategistInput
): Promise<StrategistResult> {
  try {
    const historyText = input.history
      .slice(-12)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const user = `Project:
title: ${input.project.title}
description: ${input.project.description}
audience: ${input.project.audience}
tone: ${input.project.tone}
niche: ${input.project.niche}

Recent conversation:
${historyText || "(none)"}

Latest user message:
${input.userMessage}`;

    const result = await completeJson<StrategistResult>({
      system: STRATEGIST_SYSTEM,
      user,
    });
    if (!result.assistant_message) return fallback(input);
    return result;
  } catch (err) {
    console.error("[strategist]", err);
    return fallback(input);
  }
}
