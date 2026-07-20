import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runStrategist } from "@/lib/ai/agents/strategist";
import {
  normalizeProjectState,
  mergeProjectState,
  clampReadinessScore,
} from "@/lib/project-state/normalize";
import { getSupabaseErrorMessage } from "@/lib/api/supabase-result";
import {
  MAX_CHAT_HISTORY,
  buildChatHistoryForStrategist,
  shouldPersistAfterStrategist,
} from "@/lib/project-state/chat-flow";
import { buildAssistantMetadata } from "@/lib/api/chat-metadata";
import { chatBodySchema } from "@/lib/validations/strategy";
import type { ChatMessage } from "@/types/message";
import type { ProjectStateV2 } from "@/types/strategy";

// Re-export for unit tests / shared consumers
export { chatBodySchema } from "@/lib/validations/strategy";
export {
  MAX_CHAT_HISTORY,
  buildChatHistoryForStrategist,
  shouldPersistAfterStrategist,
} from "@/lib/project-state/chat-flow";

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/chat
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // 1. Auth + ownership
  const { id } = await ctx.params;
  const access = await requireOwnedProject(id);
  if ("error" in access && access.error) return access.error;

  const { supabase, user, project } = access;

  // 2. Validate content
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400, "invalid_body");
  }
  const validation = chatBodySchema.safeParse(body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    return jsonError(firstIssue?.message ?? "validation error", 400, "validation_error");
  }
  const { content } = validation.data;

  // 3. Load current project_states -> normalize
  let currentState: ProjectStateV2;
  {
    const { data: stateRow, error: stateErr } = await supabase
      .from("project_states")
      .select("state_json, readiness_score")
      .eq("project_id", id)
      .maybeSingle();
    if (stateErr) {
      return jsonError(
        getSupabaseErrorMessage(stateErr, "Failed to load project state"),
        500,
        "db_error",
      );
    }
    const ebookType = project.ebook_type ?? "lead_magnet";
    currentState = normalizeProjectState(
      stateRow?.state_json ?? null,
      ebookType,
    );
  }

  // 4. Load true recent N messages (newest first), reverse to chronological
  let historyRows: { role: string; content: string }[];
  try {
    const { data: messages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(MAX_CHAT_HISTORY);
    historyRows = buildChatHistoryForStrategist(messages ?? [], MAX_CHAT_HISTORY);
  } catch {
    return jsonError("Failed to load messages", 500, "db_error");
  }

  // 5. Run strategist BEFORE any message/state writes.
  //    History is prior messages only; userMessage passed separately.
  //    On AI failure: no user msg insert, no state upsert, no assistant insert.
  let strategistResult: Awaited<ReturnType<typeof runStrategist>>;
  try {
    strategistResult = await runStrategist({
      currentState,
      project: {
        title: project.title,
        description: project.description,
        audience: project.audience,
        tone: project.tone,
        niche: project.niche,
        ebook_type: project.ebook_type,
        cta_goal: project.cta_goal,
        cta_url_present: Boolean(project.cta_url),
        template_id: project.template_id,
      },
      history: historyRows,
      userMessage: content,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Strategist AI failed";
    console.error("[chat] Strategist failed:", message);
    // Guard: must not persist on AI failure
    if (shouldPersistAfterStrategist(false)) {
      console.error("[chat] unexpected persist plan on AI failure");
    }
    return jsonError(message, 503, "ai_unavailable");
  }

  if (!shouldPersistAfterStrategist(true)) {
    return jsonError("Strategist AI failed", 503, "ai_unavailable");
  }

  // 6. Merge state
  const ebookType = project.ebook_type ?? "lead_magnet";
  const mergedState = mergeProjectState(
    currentState,
    strategistResult,
    ebookType,
  );
  const readiness = clampReadinessScore(strategistResult.readiness_score);

  // 7. Persist only after AI success: user message, then state, then assistant
  const { error: userMsgErr } = await supabase.from("messages").insert({
    project_id: id,
    user_id: user.id,
    role: "user",
    content,
    agent: null,
  });
  if (userMsgErr) {
    return jsonError(userMsgErr.message, 500, "db_error");
  }

  // 8. Upsert merged state + readiness_score
  try {
    const { error: upsertErr } = await supabase.from("project_states").upsert(
      {
        project_id: id,
        state_json: mergedState,
        readiness_score: readiness,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );
    if (upsertErr) {
      console.error("[chat] Failed to upsert state:", upsertErr.message);
      return jsonError(upsertErr.message, 500, "db_error");
    }
  } catch {
    return jsonError("Failed to persist state", 500, "db_error");
  }

  // 9. Insert assistant message
  let assistantMsg: ChatMessage;
  try {
    const { data: assistantRow, error: asstErr } = await supabase
      .from("messages")
      .insert({
        project_id: id,
        user_id: null,
        role: "assistant",
        content: strategistResult.assistant_message,
        agent: "strategist",
        metadata: buildAssistantMetadata(strategistResult, mergedState),
      })
      .select("*")
      .single();

    if (asstErr || !assistantRow) {
      return jsonError(
        asstErr?.message ?? "Failed to save reply",
        500,
        "db_error",
      );
    }

    assistantMsg = {
      id: assistantRow.id as string,
      project_id: assistantRow.project_id as string,
      role: assistantRow.role as "assistant",
      content: assistantRow.content as string,
      agent: assistantRow.agent as "strategist" | null,
      metadata: (assistantRow.metadata as ChatMessage["metadata"]) ?? {},
      created_at: assistantRow.created_at as string,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB error";
    return jsonError(message, 500, "db_error");
  }

  // 10. Return full response (no credit charge)
  return Response.json({
    message: assistantMsg,
    state: mergedState,
    readiness_score: readiness,
    next_action: mergedState.next_action,
    missing_fields: mergedState.missing_fields,
  });
}
