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

export async function runStrategist(
  input: StrategistInput
): Promise<StrategistResult> {
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
  if (!result.assistant_message?.trim()) {
    throw new Error("Strategist returned empty assistant_message");
  }
  return result;
}
