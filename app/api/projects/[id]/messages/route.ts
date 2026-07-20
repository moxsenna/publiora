import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { isChatMessageMetadata } from "@/types/message";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase } = access;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) return jsonError(error.message, 500, "db_error");

    // Map to ChatMessage shape — validate metadata shape; invalid → {}
    const messages = (data ?? []).map((m) => ({
      id: m.id,
      project_id: m.project_id,
      role: m.role,
      content: m.content,
      agent: m.agent ?? null,
      metadata: isChatMessageMetadata(m.metadata) ? m.metadata : {},
      created_at: m.created_at,
    }));

    return Response.json(messages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
