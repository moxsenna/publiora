import { completeJson } from "@/lib/ai/provider";
import { CTA_SYSTEM } from "@/lib/ai/prompts";

export async function runCtaGenerator(project: {
  title: string;
  audience: string;
}): Promise<string[]> {
  try {
    const result = await completeJson<{ ctas: string[] }>({
      system: CTA_SYSTEM,
      user: `Ebook: ${project.title}\nAudience: ${project.audience}`,
    });
    if (result.ctas?.length) return result.ctas.slice(0, 8);
  } catch (err) {
    console.error("[cta]", err);
  }
  return [
    "Ambil salinan gratis Anda.",
    "Klaim ebook ini sekarang.",
    "Mulai membangun hari ini.",
    "Unduh dan langsung pakai.",
  ];
}
