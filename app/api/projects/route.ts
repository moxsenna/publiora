import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import type { ProjectInput } from "@/types/project";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500, "db_error");
    }

    return Response.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const body = (await req.json().catch(() => null)) as ProjectInput | null;
    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      return jsonError("title is required", 400, "validation_error");
    }
    if (typeof body.author !== "string") {
      return jsonError("author is required", 400, "validation_error");
    }
    if (typeof body.description !== "string") {
      return jsonError("description is required", 400, "validation_error");
    }
    if (typeof body.audience !== "string") {
      return jsonError("audience is required", 400, "validation_error");
    }
    if (typeof body.tone !== "string") {
      return jsonError("tone is required", 400, "validation_error");
    }
    if (typeof body.niche !== "string") {
      return jsonError("niche is required", 400, "validation_error");
    }

    const insert = {
      owner_id: user.id,
      title: body.title.trim(),
      author: body.author,
      subtitle: body.subtitle ?? null,
      description: body.description,
      audience: body.audience,
      tone: body.tone,
      niche: body.niche,
      template_id: body.template_id ?? null,
      status: "draft" as const,
      progress: 0,
      sections_generated: 0,
      total_sections: 0,
    };

    const { data: project, error } = await supabase
      .from("projects")
      .insert(insert)
      .select("*")
      .single();

    if (error || !project) {
      return jsonError(error?.message ?? "Failed to create project", 500, "db_error");
    }

    const { error: stateError } = await supabase.from("project_states").insert({
      project_id: project.id,
      state_json: {},
      readiness_score: 0,
    });

    if (stateError) {
      // project created; state insert failed — surface error but project exists
      return jsonError(stateError.message, 500, "db_error");
    }

    return Response.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
