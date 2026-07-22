import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { sanitizeHtml } from "@/lib/sanitize";
import { deriveProjectWorkflow } from "@/lib/workflow/project-workflow";
import {
  normalizeProjectState,
  createEmptyProjectState,
  clampReadinessScore,
} from "@/lib/project-state/normalize";
import { getSupabaseErrorMessage } from "@/lib/api/supabase-result";
import type { Project } from "@/types/project";
import type { Section } from "@/types/section";
import type { Outline } from "@/types/outline";
import { loadPrimaryProjectOfferContext } from "@/lib/offers/project-offer-context";

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

function escapeCtaText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidCtaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function restoreProjectStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  id: string,
  status: string,
  now: string,
  publishedAt?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (publishedAt !== undefined) {
    patch.published_at = publishedAt;
  }
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) {
    console.error(
      "[publish] failed to restore project status",
      id,
      getSupabaseErrorMessage(error),
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let previousStatus: string | null = null;
  let previousPublishedAt: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;
  let statusSetToPublishing = false;

  try {
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    supabase = access.supabase;
    const { user, project } = access;
    previousStatus = project.status;
    previousPublishedAt = project.published_at ?? null;

    const body = (await req.json().catch(() => ({}))) as {
      is_public?: boolean;
    };

    // Load strategy — check PostgREST error explicitly
    const {
      data: stateRow,
      error: stateErr,
    } = await supabase
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

    const strategyState = stateRow?.state_json
      ? normalizeProjectState(
          stateRow.state_json,
          project.ebook_type ?? "lead_magnet",
        )
      : createEmptyProjectState(project.ebook_type ?? "lead_magnet");
    const readinessScore = clampReadinessScore(stateRow?.readiness_score);

    const { data: outlineRow, error: outlineErr } = await supabase
      .from("outlines")
      .select("*")
      .eq("project_id", id)
      .maybeSingle();
    if (outlineErr) {
      return jsonError(
        getSupabaseErrorMessage(outlineErr, "Failed to load outline"),
        500,
        "db_error",
      );
    }
    const outline: Outline | null = outlineRow
      ? mapOutline(outlineRow)
      : null;

    const { data: sectionRows, error: sectionsErr } = await supabase
      .from("ebook_sections")
      .select("*")
      .eq("project_id", id)
      .order("position", { ascending: true });
    if (sectionsErr) {
      return jsonError(
        getSupabaseErrorMessage(sectionsErr, "Failed to load sections"),
        500,
        "db_error",
      );
    }
    const sections: Section[] = (sectionRows ?? []).map((r: Record<string, unknown>) =>
      mapSection(r),
    );

    const workflow = deriveProjectWorkflow({
      project: project as Project,
      strategyState,
      readinessScore,
      outline,
      sections,
    });

    const blockers = workflow.checks.filter((c) => c.severity === "blocker");
    if (!workflow.canPublish || blockers.length > 0) {
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

    const now = new Date().toISOString();

    const { error: publishingErr } = await supabase
      .from("projects")
      .update({ status: "publishing", updated_at: now })
      .eq("id", id);
    if (publishingErr) {
      return jsonError(
        getSupabaseErrorMessage(publishingErr, "Failed to update project status"),
        500,
        "db_error",
      );
    }
    statusSetToPublishing = true;

    const publishableSections = sections
      .filter((s) => s.status === "generated" || s.status === "edited")
      .map((s) => ({
        id: s.id,
        position: s.position,
        title: s.title,
        content_html: sanitizeHtml(String(s.content_html ?? "")),
      }));

    if (publishableSections.length === 0) {
      await restoreProjectStatus(
        supabase,
        id,
        previousStatus === "published" ? "generated" : (previousStatus ?? "generated"),
        now,
        previousPublishedAt,
      );
      return jsonError("No sections to publish", 400, "empty");
    }

    const finalCta = project.final_cta
      ? escapeCtaText(String(project.final_cta).trim())
      : null;
    const ctaUrl = project.cta_url
      ? isValidCtaUrl(String(project.cta_url).trim())
        ? String(project.cta_url).trim()
        : null
      : null;

    const offer_context = await loadPrimaryProjectOfferContext({
      supabase,
      projectId: id,
      ownerId: user.id,
    });

    if (project.ebook_type === "bonus_product" && !offer_context) {
      await restoreProjectStatus(
        supabase,
        id,
        previousStatus === "published"
          ? "generated"
          : (previousStatus ?? "generated"),
        now,
        previousPublishedAt,
      );
      return jsonError(
        "Bonus Pembelian membutuhkan penawaran utama yang terhubung sebelum publish.",
        400,
        "bonus_requires_offer",
      );
    }

    const offerContextSnapshot = offer_context
      ? {
          relationship: offer_context.relationship,
          snapshot: offer_context.snapshot,
        }
      : null;

    // Prefer stable slug on republish; generate only for first publish.
    const { data: existingPub } = await supabase
      .from("published_ebooks")
      .select("id, slug")
      .eq("project_id", id)
      .maybeSingle();
    const slug =
      (existingPub?.slug as string | undefined) ||
      slugify(project.title) + "-" + Math.random().toString(36).slice(2, 6);

    const publication_snapshot = {
      title: project.title,
      subtitle: project.subtitle,
      author: project.author,
      cover_color: project.cover_color,
      sections: publishableSections,
      cta_goal: project.cta_goal ?? null,
      final_cta: finalCta,
      cta_url: ctaUrl,
      offer_context: offerContextSnapshot,
    };

    const { data: rpcPub, error: pubErr } = await supabase.rpc(
      "publish_project_atomic_v1",
      {
        p_project_id: id,
        p_publication_snapshot: publication_snapshot,
        p_is_public: body.is_public ?? true,
        p_slug: slug,
      },
    );

    if (pubErr || !rpcPub) {
      await restoreProjectStatus(
        supabase,
        id,
        previousStatus === "published" ? "generated" : (previousStatus ?? "generated"),
        now,
        previousPublishedAt,
      );
      return jsonError(
        getSupabaseErrorMessage(pubErr, "Publish failed"),
        500,
        "db_error",
      );
    }

    const pub = Array.isArray(rpcPub) ? rpcPub[0] : rpcPub;
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
    if (statusSetToPublishing && supabase && previousStatus) {
      await restoreProjectStatus(
        supabase,
        id,
        previousStatus === "published" ? "generated" : previousStatus,
        new Date().toISOString(),
        previousPublishedAt,
      );
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}
