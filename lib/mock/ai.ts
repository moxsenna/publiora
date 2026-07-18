// Mock AI agents — simulate streaming + outline/chat responses.

import type { AgentName } from "@/types/message";
import type { Outline, OutlineSection, Section } from "@/types";

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

/** Compose a strategist chat reply for project brief. */
export function strategistReply(project: {
  title: string;
  description: string;
}): string {
  return `Saya baca brief "${project.title}". ${project.description.slice(
    0,
    120
  )}\n\nUsulan pillar: 3 sumur topik, diturunkan ke 5–7 bagian outline. Kalau Anda approve arah ini, saya minta Planner menyusun kerangka detail.`;
}

/** Generate an outline draft from a project brief. */
export function plannerOutline(
  project: { id: string; title: string; audience: string; tone: string }
): Outline {
  const sections: OutlineSection[] = [
    {
      id: "gen_" + Math.random().toString(36).slice(2, 8),
      position: 1,
      title: "Konteks: kenapa topik ini penting sekarang",
      summary: "Pembingkaian masalah & momentum audiens.",
      key_points: ["Tren pendukung", "Tapi celah masih kosong", "Kontak ke persona"],
      estimated_words: 700,
      status: "pending",
    },
    {
      id: "gen_" + Math.random().toString(36).slice(2, 8),
      position: 2,
      title: "Kerangka inti",
      summary: "Definisi konsep dan beberapa analogi.",
      key_points: ["Definisi operasional", "Analogi konkret", "Batas/pengecualian"],
      estimated_words: 800,
      status: "pending",
    },
    {
      id: "gen_" + Math.random().toString(36).slice(2, 8),
      position: 3,
      title: "Sistem step-by-step",
      summary: "Urutan langkah taktis untuk audiens.",
      key_points: ["Prasyarat", "Urutan langkah", "Pengecekan intermediate"],
      estimated_words: 950,
      status: "pending",
    },
    {
      id: "gen_" + Math.random().toString(36).slice(2, 8),
      position: 4,
      title: "Pitfall & perbaikan",
      summary: "Kesalahan umum dan remedial.",
      key_points: ["Pitfall 3", "Sinyal dini", "Remedial langsung"],
      estimated_words: 750,
      status: "pending",
    },
    {
      id: "gen_" + Math.random().toString(36).slice(2, 8),
      position: 5,
      title: "Lanjutan & ukur",
      summary: "Indikator sukses & langkah berikut.",
      key_points: ["Leading metric", "Lanjutan loop", "Resource ekstra"],
      estimated_words: 700,
      status: "pending",
    },
  ];

  return {
    id: "out_" + Math.random().toString(36).slice(2, 10),
    project_id: project.id,
    title: project.title,
    description: `Outline draft dari Planner untuk audiens ${project.audience} dengan tone ${project.tone}.`,
    sections,
    approved: false,
    approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Generate Section HTML body from a section summary. */
export function writerSection(
  section: Pick<OutlineSection, "title" | "summary" | "key_points">,
  project: { tone: string }
): Pick<Section, "content_html" | "word_count"> {
  const keyPts = section.key_points
    .map((k) => `<li>${k}</li>`)
    .join("");
  const body =
    `<p>${section.summary} Tone: ${project.tone}.</p>` +
    `<p>Bagian ini membedah ${section.title.toLowerCase()} dengan pola taktis yang dapat langsung Anda terapkan. Setiap poin di bawah dibahas secara mendalam dan diikuti contoh nyata.</p>` +
    `<ul>${keyPts}</ul>` +
    `<p>Selesai dengan ringkas: yang penting tahu kapan harus mundur dan kapan harus menekan tombol. Sebelum lanjut, pastikan semua prasyarat dipenuhi.</p>` +
    `<blockquote>Setiap sistem yang baik punya pintu keluar. Sistem tanpa pintu keluar akhirnya menjadi penjara.</blockquote>`;
  const word_count = body.split(/\s+/).length;
  return { content_html: body, word_count };
}

/** Generate title variants for a project. */
export function titleVariants(title: string): string[] {
  return [
    title,
    `The ${title} Handbook`,
    `${title}: 30 Hari Membenamkan Sistem`,
    `Ringkas: ${title}`,
  ];
}

/** Generate CTA variations. */
export function ctaVariants(): string[] {
  return [
    "Ambil salinan gratis Anda.",
    "Klaim ebook ini sekarang.",
    "Mulai membangun hari ini.",
    "Unduh dan langsung pakai.",
  ];
}

/** Stream tokens from a string, calling onToken for each word. */
export async function streamText(
  text: string,
  onToken: (chunk: string) => void,
  opts: { signal?: AbortSignal; speedMs?: number } = {}
): Promise<void> {
  const words = text.split(" ");
  const speed = opts.speedMs ?? 60;
  for (const w of words) {
    if (opts.signal?.aborted) return;
    onToken(w + " ");
    await sleep(speed);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
