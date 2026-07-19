import { z } from "zod";
import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runStrategist } from "@/lib/ai/agents/strategist";
import {
  normalizeProjectState,
  mergeProjectState,
  clampReadinessScore,
} from "@/lib/project-state/normalize";
import type { ChatMessage } from "@/types/message";
import type { ProjectStateV2 } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const chatBodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "content is required")
    .max(4000, "content too long"),
});

const MAX_HISTORY = 20;

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
  try {
    const { data: stateRow } = await supabase
      .from("project_states")
      .select("state_json, readiness_score")
      .eq("project_id", id)
      .maybeSingle();

    currentState = normalizeProjectState(stateRow?.state_json ?? null);
  } catch {
    return jsonError("Failed to load project state", 500, "db_error");
  }

  // 4. Load recent messages
  let historyRows: { role: string; content: string }[];
  try {
    const { data: messages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY);
    historyRows = messages ?? [];
  } catch {
    return jsonError("Failed to load messages", 500, "db_error");
  }

  // 5. Insert user message
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

  // 6. Run strategist
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
      },
      history: historyRows.map((h) => ({
        role: h.role,
        content: h.content,
      })),
      userMessage: content,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Strategist AI failed";
    console.error("[chat] Strategist failed:", message);
    // 6a. On AI failure: leave state unchanged, return error
    return jsonError(message, 503, "ai_unavailable");
  }

  // 7. Merge state
  const mergedState = mergeProjectState(currentState, strategistResult);
  const readiness = clampReadinessScore(strategistResult.readiness_score);

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
