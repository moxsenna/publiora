import { completeJson } from "@/lib/ai/provider";
import { CTA_SYSTEM } from "@/lib/ai/prompts";

export async function runCtaGenerator(project: {
  title: string;
  audience: string;
}): Promise<string[]> {
  const result = await completeJson<{ ctas: string[] }>({
    system: CTA_SYSTEM,
    user: `Ebook: ${project.title}\nAudience: ${project.audience}`,
  });
  if (!result.ctas?.length) {
    throw new Error("CTA generator returned no ctas");
  }
  return result.ctas.slice(0, 8);
}
