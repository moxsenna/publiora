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

function fallback(input: WriterInput): WriterResult {
  const pts = input.section.key_points.map((k) => `<li>${k}</li>`).join("");
  const html = `<p>${input.section.summary || input.section.title}. Ditulis untuk ${input.project.audience} dengan tone ${input.project.tone}.</p>
<p>Bagian ini membedah <strong>${input.section.title}</strong> secara taktis agar langsung bisa dipraktikkan.</p>
<ul>${pts || "<li>Terapkan satu langkah kecil hari ini</li>"}</ul>
<blockquote>Sistem yang baik punya pintu keluar. Tanpa itu, ia jadi penjara.</blockquote>
<p>Ringkas: pastikan prasyarat jelas, eksekusi berurutan, dan ukur hasil sebelum scale.</p>`;
  return {
    title: input.section.title,
    content_html: html,
    word_count: html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
  };
}

export async function runWriter(input: WriterInput): Promise<WriterResult> {
  try {
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
    if (!result.content_html) return fallback(input);
    const word_count =
      result.word_count ||
      result.content_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return {
      title: result.title || input.section.title,
      content_html: result.content_html,
      word_count,
    };
  } catch (err) {
    console.error("[writer]", err);
    return fallback(input);
  }
}
