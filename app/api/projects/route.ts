import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import {
  createProjectRequestV2Schema,
  isCreateProjectV2,
  legacyProjectInputSchema,
} from "@/lib/projects/create-project-schema";
import {
  normalizeCreateProjectV2,
  normalizeLegacyCreateProject,
} from "@/lib/projects/normalize-create-project";
import { isTemplateCompatible } from "@/lib/templates-catalog";
import type { EbookType } from "@/types/project";

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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON body", 400, "validation_error");
    }

    let normalized;
    if (isCreateProjectV2(body)) {
      const parsed = createProjectRequestV2Schema.safeParse(body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return jsonError(
          first?.message ?? "validation error",
          400,
          "validation_error",
          { issues: parsed.error.issues },
        );
      }
      normalized = normalizeCreateProjectV2(parsed.data, user.id);
    } else {
      // Legacy flat ProjectInput — deprecation window
      console.warn(
        "[projects] legacy ProjectInput create; migrate to CreateProjectRequestV2",
      );
      const parsed = legacyProjectInputSchema.safeParse(body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return jsonError(
          first?.message ?? "validation error",
          400,
          "validation_error",
          { issues: parsed.error.issues },
        );
      }
      normalized = normalizeLegacyCreateProject(parsed.data, user.id);
    }

    const ebookType = normalized.projectInsert.ebook_type as EbookType;
    const templateId = normalized.projectInsert.template_id;
    if (!isTemplateCompatible(templateId, ebookType)) {
      return jsonError(
        "Template ini tidak tersedia untuk tipe ebook yang dipilih.",
        400,
        "invalid_template",
      );
    }

    const { data: project, error } = await supabase.rpc(
      "create_project_with_state",
      {
        p_project: normalized.projectInsert,
        p_state: normalized.initialState,
        p_readiness_score: normalized.readinessScore,
      },
    );

    if (error || !project) {
      // Fallback for environments without the RPC yet (dev only path)
      if (
        error?.message?.includes("create_project_with_state") ||
        error?.code === "PGRST202" ||
        error?.code === "42883"
      ) {
        const insert = { ...normalized.projectInsert };
        const { data: created, error: insertErr } = await supabase
          .from("projects")
          .insert(insert)
          .select("*")
          .single();
        if (insertErr || !created) {
          return jsonError(
            insertErr?.message ?? "Failed to create project",
            500,
            "db_error",
          );
        }
        const { error: stateError } = await supabase
          .from("project_states")
          .insert({
            project_id: created.id,
            state_json: normalized.initialState,
            readiness_score: normalized.readinessScore,
          });
        if (stateError) {
          // Best-effort cleanup to avoid orphan project without state
          await supabase.from("projects").delete().eq("id", created.id);
          return jsonError(stateError.message, 500, "db_error");
        }
        return Response.json(created, { status: 201 });
      }

      return jsonError(
        error?.message ?? "Failed to create project",
        500,
        "db_error",
      );
    }

    return Response.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
