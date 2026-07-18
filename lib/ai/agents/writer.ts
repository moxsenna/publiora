import { completeJson } from "@/lib/ai/provider";
import { WRITER_SYSTEM } from "@/lib/ai/prompts";

export type WriterInput = {
  project: { title: string; audience: string; tone: string; niche: string };
  section: {
    title: string;
    summary: string;
    key_points: string[];
  };
};

export type WriterResult = {
  title: string;
  content_html: string;
  word_count: number;
};

export async function runWriter(input: WriterInput): Promise<WriterResult> {
  const user = `Project: ${input.project.title}
audience: ${input.project.audience}
tone: ${input.project.tone}
niche: ${input.project.niche}

Write this section only:
title: ${input.section.title}
summary: ${input.section.summary}
key_points: ${JSON.stringify(input.section.key_points)}`;
  const result = await completeJson<WriterResult>({
    system: WRITER_SYSTEM,
    user,
  });
  if (!result.content_html?.trim()) {
    throw new Error("Writer returned empty content_html");
  }
  const word_count =
    result.word_count ||
    result.content_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean)
      .length;
  return {
    title: result.title || input.section.title,
    content_html: result.content_html,
    word_count,
  };
}
