import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import type { Project } from "@/types/project";

export async function requireOwnedProject(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: jsonError("Unauthorized", 401, "unauthorized") } as const;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: jsonError(error.message, 500, "db_error") } as const;
  }
  if (!project) {
    return { error: jsonError("Project not found", 404, "not_found") } as const;
  }

  return {
    supabase,
    user,
    project: project as Project,
  } as const;
}
