import type { EbookGenerationMemory } from "@/types/generation-memory";
import {
  emptyGenerationMemory,
  normalizeGenerationMemory,
} from "@/lib/generation-memory/merge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function loadProjectGenerationMemory(
  supabase: SupabaseLike,
  projectId: string,
): Promise<EbookGenerationMemory> {
  try {
    const { data, error } = await supabase
      .from("project_generation_memory")
      .select("memory_json")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error || !data?.memory_json) {
      return emptyGenerationMemory();
    }
    return normalizeGenerationMemory(data.memory_json);
  } catch {
    return emptyGenerationMemory();
  }
}

export async function upsertProjectGenerationMemory(
  supabase: SupabaseLike,
  projectId: string,
  memory: EbookGenerationMemory,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = {
      project_id: projectId,
      schema_version: 1,
      memory_json: normalizeGenerationMemory(memory),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("project_generation_memory")
      .upsert(payload, { onConflict: "project_id" });
    if (error) {
      return { ok: false, error: error.message ?? "memory upsert failed" };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "memory upsert failed",
    };
  }
}
