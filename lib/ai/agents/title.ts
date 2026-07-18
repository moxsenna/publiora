import { completeJson } from "@/lib/ai/provider";
import { TITLE_SYSTEM } from "@/lib/ai/prompts";

export async function runTitleGenerator(project: {
  title: string;
  description: string;
  audience: string;
}): Promise<string[]> {
  try {
    const result = await completeJson<{ titles: string[] }>({
      system: TITLE_SYSTEM,
      user: `Current title: ${project.title}\nAudience: ${project.audience}\nBrief: ${project.description}`,
    });
    if (result.titles?.length) return result.titles.slice(0, 8);
  } catch (err) {
    console.error("[title]", err);
  }
  return [
    project.title,
    `The ${project.title} Handbook`,
    `${project.title}: 30 Hari Membangun Sistem`,
    `Ringkas: ${project.title}`,
  ];
}
