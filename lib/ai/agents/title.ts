import { completeJson } from "@/lib/ai/provider";
import { TITLE_SYSTEM } from "@/lib/ai/prompts";

export async function runTitleGenerator(project: {
  title: string;
  description: string;
  audience: string;
}): Promise<string[]> {
  const result = await completeJson<{ titles: string[] }>({
    system: TITLE_SYSTEM,
    user: `Current title: ${project.title}\nAudience: ${project.audience}\nBrief: ${project.description}`,
  });
  if (!result.titles?.length) {
    throw new Error("Title generator returned no titles");
  }
  return result.titles.slice(0, 8);
}
