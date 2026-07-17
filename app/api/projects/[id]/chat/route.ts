import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runStrategist } from "@/lib/ai/agents/strategist";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, user, project } = access;
    const body = (await req.json().catch(() => null)) as {
      content?: string;
      agent?: string;
    } | null;

    const content = body?.content?.trim();
    if (!content) return jsonError("content is required", 400, "validation_error");

    // Insert user message
    const { error: userMsgErr } = await supabase.from("messages").insert({
      project_id: id,
      user_id: user.id,
      role: "user",
      content,
      agent: null,
    });
    if (userMsgErr) return jsonError(userMsgErr.message, 500, "db_error");

    // Load history
    const { data: historyRows } = await supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      .limit(20);

    const strategist = await runStrategist({
      project: {
        title: project.title,
        description: project.description,
        audience: project.audience,
        tone: project.tone,
        niche: project.niche,
      },
      history: (historyRows ?? []).map((h) => ({
        role: h.role,
        content: h.content,
      })),
      userMessage: content,
    });

    // Upsert project_states
    const readiness = Math.min(
      100,
      Math.max(0, strategist.readiness_score ?? 50)
    );
    await supabase.from("project_states").upsert(
      {
        project_id: id,
        state_json: strategist.state_patch ?? {},
        readiness_score: readiness,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );

    // Insert assistant message
    const { data: assistantRow, error: asstErr } = await supabase
      .from("messages")
      .insert({
        project_id: id,
        user_id: null,
        role: "assistant",
        content: strategist.assistant_message,
        agent: "strategist",
      })
      .select("*")
      .single();

    if (asstErr || !assistantRow) {
      return jsonError(asstErr?.message ?? "Failed to save reply", 500, "db_error");
    }

    return Response.json({
      id: assistantRow.id,
      project_id: assistantRow.project_id,
      role: assistantRow.role,
      content: assistantRow.content,
      agent: assistantRow.agent,
      created_at: assistantRow.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
