import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { sanitizeHtml } from "@/lib/sanitize";
import { deriveProjectWorkflow } from "@/lib/workflow/project-workflow";
import {
  normalizeProjectState,
  createEmptyProjectState,
  clampReadinessScore,
} from "@/lib/project-state/normalize";
import type { Project } from "@/types/project";
import type { Section } from "@/types/section";
import type { Outline } from "@/types/outline";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

function mapSection(row: Record<string, unknown>): Section {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    outline_section_id: String(row.outline_section_id),
    position: Number(row.position),
    title: String(row.title),
    content_html: String(row.content_html ?? ""),
    word_count: Number(row.word_count ?? 0),
    status: row.status as Section["status"],
    updated_at: String(row.updated_at),
  };
}

function mapOutline(row: Record<string, unknown>): Outline {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    sections: (row.sections as Outline["sections"]) ?? [],
    approved: Boolean(row.approved),
    approved_at: (row.approved_at as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Escape CTA text for safe rendering
// ---------------------------------------------------------------------------

function escapeCtaText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isValidCtaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/publish
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  try {
    // 1. Load project
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, user, project } = access;

    const body = (await req.json().catch(() => ({}))) as {
      is_public?: boolean;
    };

    // 2. Load strategy state + readiness from project_states
    let strategyState;
    let readinessScore = 0;
    try {
      const { data: stateRow } = await supabase
        .from("project_states")
        .select("state_json, readiness_score")
        .eq("project_id", id)
        .maybeSingle();

      if (stateRow?.state_json) {
        strategyState = normalizeProjectState(stateRow.state_json);
      } else {
        strategyState = createEmptyProjectState();
      }
      readinessScore = clampReadinessScore(stateRow?.readiness_score);
    } catch (err) {
      return jsonError("Failed to load project state", 500, "db_error");
    }

    // 3. Load outline
    let outline: Outline | null = null;
    try {
      const { data: outlineRow } = await supabase
        .from("outlines")
        .select("*")
        .eq("project_id", id)
        .maybeSingle();
      if (outlineRow) {
        outline = mapOutline(outlineRow);
      }
    } catch {
      return jsonError("Failed to load outline", 500, "db_error");
    }

    // 4. Load ALL sections (not only generated/edited — deriveProjectWorkflow
    //    checks all persisted sections against outline)
    let sections: Section[] = [];
    try {
      const { data: sectionRows } = await supabase
        .from("ebook_sections")
        .select("*")
        .eq("project_id", id)
        .order("position", { ascending: true });
      sections = (sectionRows ?? []).map((r) => mapSection(r));
    } catch {
      return jsonError("Failed to load sections", 500, "db_error");
    }

    // 5. deriveProjectWorkflow
    const workflow = deriveProjectWorkflow({
      project: project as Project,
      strategyState,
      readinessScore,
      outline,
      sections,
    });

    // 6. Blockers from workflow checks
    const blockers = workflow.checks.filter(
      (c) => c.severity === "blocker",
    );

    const hasBlockers = blockers.length > 0;

    // 7. If !canPublish or blockers exist: 409 WITHOUT setting publishing status
    if (!workflow.canPublish || hasBlockers) {
      return jsonError(
        "Publish blocked — resolve issues before publishing.",
        409,
        "publish_blocked",
        {
          blockers: workflow.blockers.map((b) => ({
            code: b.code,
            message: b.message,
            targetStep: b.targetStep,
          })),
          checks: workflow.checks
            .filter((c) => c.severity === "blocker")
            .map((c) => ({
              id: c.id,
              label: c.label,
              severity: c.severity,
              targetStep: c.targetStep,
            })),
        },
      );
    }

    // 8. Save previous status for rollback
    const previousStatus = project.status;

    // 9. Set publishing status
    const now = new Date().toISOString();
    try {
      await supabase
        .from("projects")
        .update({ status: "publishing", updated_at: now })
        .eq("id", id);
    } catch {
      return jsonError("Failed to update project status", 500, "db_error");
    }

    // 10. Delete previous publications for this project
    try {
      await supabase.from("published_ebooks").delete().eq("project_id", id);
    } catch {
      await supabase
        .from("projects")
        .update({ status: previousStatus, updated_at: now })
        .eq("id", id);
      return jsonError("Failed to remove previous publication", 500, "db_error");
    }

    // 11. Build sanitized snapshot
    const slug =
      slugify(project.title) +
      "-" +
      Math.random().toString(36).slice(2, 6);

    // Get only generated/edited sections for the published snapshot
    const publishableSections = sections
      .filter((s) => s.status === "generated" || s.status === "edited")
      .map((s) => ({
        id: s.id,
        position: s.position,
        title: s.title,
        content_html: sanitizeHtml(String(s.content_html ?? "")),
      }));

    if (publishableSections.length === 0) {
      const restoredStatus = previousStatus === "published" ? "generated" : previousStatus;
      await supabase
        .from("projects")
        .update({ status: restoredStatus, updated_at: now })
        .eq("id", id);
      return jsonError("No sections to publish", 400, "empty");
    }

    // 12. Sanitize CTA fields
    const finalCta = project.final_cta
      ? escapeCtaText(String(project.final_cta).trim())
      : null;
    const ctaUrl = project.cta_url
      ? (isValidCtaUrl(String(project.cta_url).trim())
          ? String(project.cta_url).trim()
          : null)
      : null;

    // 13. Insert publication snapshot with CTA
    const { data: insertedPub, error: pubErr } = await supabase
      .from("published_ebooks")
      .insert({
        project_id: id,
        creator_id: user.id,
        title: project.title,
        slug,
        subtitle: project.subtitle,
        author: project.author,
        cover_color: project.cover_color,
        sections: publishableSections,
        is_public: body.is_public ?? true,
        total_readers: 0,
        active_claims: 0,
        published_at: now,
        cta_goal: project.cta_goal ?? null,
        final_cta: finalCta,
        cta_url: ctaUrl,
      })
      .select("*")
      .single();

    if (pubErr || !insertedPub) {
      // On insert fail: restore previous status
      const restoredStatus = previousStatus === "published" ? "generated" : previousStatus;
      await supabase
        .from("projects")
        .update({ status: restoredStatus, updated_at: now })
        .eq("id", id);
      return jsonError("Publish failed", 500, "db_error");
    }

    const pub = insertedPub;

    // 14. Set published status on project
    try {
      await supabase
        .from("projects")
        .update({
          status: "published",
          published_at: now,
          updated_at: now,
        })
        .eq("id", id);
    } catch {
      // Project status update failed but publication record exists — log and continue
      console.error("Failed to update project status to published for project", id);
    }

    // 15. Return success
    return Response.json({
      id: pub.id,
      project_id: pub.project_id,
      slug: pub.slug,
      title: pub.title,
      author: pub.author,
      subtitle: pub.subtitle,
      cover_color: pub.cover_color,
      sections: pub.sections,
      published_at: pub.published_at,
      total_readers: pub.total_readers,
      active_claims: pub.active_claims,
      is_public: pub.is_public,
      cta_goal: pub.cta_goal ?? null,
      final_cta: pub.final_cta ?? null,
      cta_url: pub.cta_url ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
