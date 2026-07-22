import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runWriterWithQualityGate } from "@/lib/ai/agents/writer";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import type { Outline, OutlineSection } from "@/types/outline";
import type { Section } from "@/types/section";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  normalizeProjectState,
  createEmptyProjectState,
} from "@/lib/project-state/normalize";
import type { EbookStrategy } from "@/types/strategy";
import { getSupabaseErrorMessage } from "@/lib/api/supabase-result";
import { setOutlineSectionStatus } from "@/lib/outline/section-status";
import { loadPrimaryProjectOfferContext } from "@/lib/offers/project-offer-context";
import { planGenerationRestore } from "@/lib/outline/generation-recovery";
import { resolveFormatContext } from "@/lib/templates/format-context";
import type { FormatContext } from "@/types/template";
import { validateSectionContent } from "@/lib/quality/section-validator";
import { countWords } from "@/lib/quality/text-analysis";
import {
  loadProjectGenerationMemory,
  upsertProjectGenerationMemory,
} from "@/lib/generation-memory/store";
import { mergeWriterMetaIntoMemory } from "@/lib/generation-memory/merge";
import {
  createSectionRevision,
  sectionHasReplaceableContent,
} from "@/lib/section-revisions";

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

function plainSummaryFromHtml(html: string, max = 400): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let charged = false;
  let userId: string | null = null;

  try {
    const { id } = await ctx.params;
    const access = await requireOwnedProject(id);
    if ("error" in access && access.error) return access.error;

    const { supabase, user, project } = access;
    userId = user.id;

    const body = (await req.json().catch(() => null)) as {
      outline_section_id?: string;
      all?: boolean;
      confirm_replace_existing?: boolean;
    } | null;

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
    if (!outlineRow) return jsonError("Outline not found", 404, "not_found");
    if (!outlineRow.approved) {
      return jsonError(
        "Approve outline before generating sections",
        400,
        "outline_not_approved",
      );
    }

    // Strategy context for writer
    const { data: stateRow, error: stateErr } = await supabase
      .from("project_states")
      .select("state_json")
      .eq("project_id", id)
      .maybeSingle();
    if (stateErr) {
      return jsonError(
        getSupabaseErrorMessage(stateErr, "Failed to load strategy state"),
        500,
        "db_error",
      );
    }
    const ebookType =
      project.ebook_type === "bonus_product" ||
      project.ebook_type === "sellable_ebook" ||
      project.ebook_type === "lead_magnet"
        ? project.ebook_type
        : "lead_magnet";
    const strategyState = stateRow?.state_json
      ? normalizeProjectState(stateRow.state_json, ebookType)
      : createEmptyProjectState(ebookType);
    const strategy: EbookStrategy = strategyState.strategy;

    // Mutable outline section statuses — critical for generate-all consistency
    let mutableOutlineSections: OutlineSection[] = [
      ...((outlineRow.sections as OutlineSection[]) ?? []),
    ];

    const projectMeta = {
      id: project.id as string,
      title: project.title as string,
      audience: project.audience as string,
      tone: project.tone as string,
      niche: project.niche as string,
      ebook_type: (project.ebook_type as string) ?? "lead_magnet",
      total_sections: Number(project.total_sections ?? mutableOutlineSections.length),
    };

    const format_context = resolveFormatContext({
      ebookType,
      templateId: (project.template_id as string | null) ?? null,
    });

    // Generate all: sequential with shared mutable outline state
    if (body?.all) {
      const results: Section[] = [];
      for (let i = 0; i < mutableOutlineSections.length; i++) {
        const os = mutableOutlineSections[i];
        const one = await generateOne({
          supabase,
          userId: user.id,
          project: projectMeta,
          outlineSection: os,
          outlineSections: mutableOutlineSections,
          strategy,
          format_context,
          sectionIndex: i,
        });
        if ("error" in one) return one.error;
        results.push(one.section);
        mutableOutlineSections = one.outlineSections;
      }
      return Response.json(results);
    }

    const outlineSectionId = body?.outline_section_id;
    if (!outlineSectionId) {
      return jsonError("outline_section_id required", 400, "validation_error");
    }
    const sectionIndex = mutableOutlineSections.findIndex(
      (s) => s.id === outlineSectionId,
    );
    if (sectionIndex < 0) {
      return jsonError("Outline section not found", 404, "not_found");
    }
    const os = mutableOutlineSections[sectionIndex];

    // Require confirmation when replacing existing content (single-section path).
    const { data: existingContent } = await supabase
      .from("ebook_sections")
      .select("id, content_html, status")
      .eq("project_id", id)
      .eq("outline_section_id", outlineSectionId)
      .maybeSingle();

    if (
      sectionHasReplaceableContent(existingContent) &&
      body?.confirm_replace_existing !== true
    ) {
      return jsonError(
        "Section already has content. Confirm replace to regenerate.",
        409,
        "section_replace_confirmation_required",
        {
          outline_section_id: outlineSectionId,
          section_id: existingContent?.id ?? null,
        },
      );
    }

    try {
      await chargeGeneration(user.id, "section", id);
      charged = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return jsonError(e.message, 402, "insufficient_credits");
      }
      throw err;
    }

    const one = await generateOne({
      supabase,
      userId: user.id,
      project: projectMeta,
      outlineSection: os,
      outlineSections: mutableOutlineSections,
      strategy,
      format_context,
      sectionIndex,
      alreadyCharged: true,
      revisionSource: sectionHasReplaceableContent(existingContent)
        ? "before_regenerate"
        : null,
    });
    if ("error" in one) {
      if (charged) {
        await grantCredits({
          userId: user.id,
          amount: CREDIT_COSTS.section,
          type: "refund",
          label: "Refund section generate failure",
          meta: { project_id: id },
        }).catch(() => null);
      }
      return one.error;
    }
    return Response.json(one.section);
  } catch (err) {
    if (charged && userId) {
      await grantCredits({
        userId,
        amount: CREDIT_COSTS.section,
        type: "refund",
        label: "Refund section generate failure",
      }).catch(() => null);
    }
    const message = err instanceof Error ? err.message : "Server error";
    return jsonError(message, 503, "unavailable");
  }
}

async function generateOne(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  project: {
    id: string;
    title: string;
    audience: string;
    tone: string;
    niche: string;
    ebook_type: string;
    total_sections: number;
  };
  outlineSection: OutlineSection;
  /** Current mutable outline sections (statuses must accumulate across generate-all). */
  outlineSections: OutlineSection[];
  strategy: EbookStrategy;
  format_context: FormatContext;
  sectionIndex: number;
  alreadyCharged?: boolean;
  /** When set, snapshot current content before overwrite. */
  revisionSource?: "before_regenerate" | null;
}): Promise<
  | { section: Section; outlineSections: OutlineSection[] }
  | { error: Response }
> {
  const {
    supabase,
    userId,
    project,
    outlineSection,
    strategy,
    format_context,
    sectionIndex,
    revisionSource = null,
  } = opts;
  let outlineSections = [...opts.outlineSections];
  let chargedHere = false;
  const previousSectionStatus = outlineSection.status ?? "pending";
  /** Project row flipped to generating — restore even if outline mark fails. */
  let projectMarkedGenerating = false;
  /** Outline section flipped to generating. */
  let sectionMarkedGenerating = false;

  const markSectionStatus = async (
    status: OutlineSection["status"],
  ): Promise<string | null> => {
    if (sectionIndex < 0) return null;
    outlineSections = setOutlineSectionStatus(
      outlineSections,
      outlineSection.id,
      status,
    );
    const { error } = await supabase
      .from("outlines")
      .update({
        sections: outlineSections,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", project.id);
    return error
      ? getSupabaseErrorMessage(error, "Failed to update outline status")
      : null;
  };

  const restoreProjectProgress = async () => {
    const { count } = await supabase
      .from("ebook_sections")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .in("status", ["generated", "edited"]);
    const generated = count ?? 0;
    const total = project.total_sections || outlineSections.length || 1;
    const progress = Math.round((generated / total) * 100);
    const status = generated >= total ? "generated" : "approved";
    const { error } = await supabase
      .from("projects")
      .update({
        sections_generated: generated,
        progress,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);
    if (error) {
      console.error(
        "[sections/generate] restoreProjectProgress failed",
        getSupabaseErrorMessage(error),
      );
    }
  };

  const restoreAfterFailure = async () => {
    const plan = planGenerationRestore({
      projectMarkedGenerating,
      sectionMarkedGenerating,
      previousSectionStatus,
    });
    if (plan.shouldRestoreSection && plan.sectionStatus) {
      await markSectionStatus(plan.sectionStatus);
    }
    if (plan.shouldRestoreProject) {
      await restoreProjectProgress();
    }
  };

  const refundLocalCharge = async (label: string) => {
    if (!chargedHere) return;
    await grantCredits({
      userId,
      amount: CREDIT_COSTS.section,
      type: "refund",
      label,
      meta: {
        project_id: project.id,
        outline_section_id: outlineSection.id,
      },
    }).catch(() => null);
    chargedHere = false;
  };

  if (!opts.alreadyCharged) {
    try {
      await chargeGeneration(userId, "section", project.id);
      chargedHere = true;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "insufficient_credits") {
        return { error: jsonError(e.message, 402, "insufficient_credits") };
      }
      throw err;
    }
  }

  try {
    const { error: projGenErr } = await supabase
      .from("projects")
      .update({ status: "generating", updated_at: new Date().toISOString() })
      .eq("id", project.id);
    if (projGenErr) {
      await refundLocalCharge("Refund section generate DB failure");
      return {
        error: jsonError(
          getSupabaseErrorMessage(projGenErr, "Failed to mark generating"),
          500,
          "db_error",
        ),
      };
    }
    projectMarkedGenerating = true;

    // Mark current section generating on mutable copy, then persist
    {
      const errMsg = await markSectionStatus("generating");
      if (errMsg) {
        // Project already generating — must restore even though section mark failed
        await restoreAfterFailure();
        await refundLocalCharge("Refund section generate DB failure");
        return { error: jsonError(errMsg, 500, "db_error") };
      }
      sectionMarkedGenerating = true;
    }

    const prevOs =
      sectionIndex > 0 ? outlineSections[sectionIndex - 1] : null;
    const nextOs =
      sectionIndex < outlineSections.length - 1
        ? outlineSections[sectionIndex + 1]
        : null;

    // Previous written body summary when available
    let previousSectionBodySummary: string | null = null;
    if (prevOs) {
      const { data: prevRow } = await supabase
        .from("ebook_sections")
        .select("content_html")
        .eq("project_id", project.id)
        .eq("outline_section_id", prevOs.id)
        .maybeSingle();
      if (prevRow?.content_html) {
        previousSectionBodySummary = plainSummaryFromHtml(
          String(prevRow.content_html),
        );
      }
    }

    const offer_context = await loadPrimaryProjectOfferContext({
      supabase,
      projectId: project.id,
      ownerId: userId,
    });

    const generation_memory = await loadProjectGenerationMemory(
      supabase,
      project.id,
    );

    const targetWords =
      outlineSection.estimated_words ||
      format_context.default_target_words ||
      700;
    const isFinalSection = sectionIndex >= outlineSections.length - 1;
    let previousContentHtml: string | null = null;
    if (prevOs) {
      const { data: prevFull } = await supabase
        .from("ebook_sections")
        .select("content_html")
        .eq("project_id", project.id)
        .eq("outline_section_id", prevOs.id)
        .maybeSingle();
      previousContentHtml = prevFull?.content_html
        ? String(prevFull.content_html)
        : null;
    }

    let qualityPass;
    try {
      qualityPass = await runWriterWithQualityGate({
        input: {
          project: {
            title: project.title,
            audience: project.audience,
            tone: project.tone,
            niche: project.niche,
            ebook_type: project.ebook_type,
          },
          strategy,
          offer_context,
          format_context,
          generation_memory,
          outlineSections: outlineSections.map((s) => ({
            id: s.id,
            title: s.title,
            summary: s.summary,
            position: s.position,
          })),
          section: {
            id: outlineSection.id,
            title: outlineSection.title,
            summary: outlineSection.summary,
            key_points: outlineSection.key_points,
            estimated_words: outlineSection.estimated_words,
            position: outlineSection.position,
          },
          previousSection: prevOs
            ? { title: prevOs.title, summary: prevOs.summary }
            : null,
          nextSection: nextOs
            ? { title: nextOs.title, summary: nextOs.summary }
            : null,
          previousSectionBodySummary,
        },
        sanitize: sanitizeHtml,
        validate: ({ content_html, pre_sanitize_html, generation_meta }) =>
          validateSectionContent({
            section_id: outlineSection.id,
            content_html,
            pre_sanitize_html,
            target_words: targetWords,
            key_points: outlineSection.key_points ?? [],
            format_context,
            previous_content_html: previousContentHtml,
            offer_name: offer_context?.snapshot.name ?? null,
            is_final_section: isFinalSection,
            generation_meta,
          }),
      });
    } catch (writerErr) {
      await restoreAfterFailure();
      await refundLocalCharge("Refund section generate quality failure");
      const e = writerErr as Error & { code?: string };
      if (e.code === "section_quality_failed") {
        return {
          error: jsonError(
            e.message || "Section failed quality validation",
            422,
            "section_quality_failed",
          ),
        };
      }
      throw writerErr;
    }

    const written = {
      title: qualityPass.result.title,
      content_html: qualityPass.content_html,
      word_count: qualityPass.word_count || countWords(qualityPass.content_html),
      section_summary: qualityPass.result.section_summary,
      generation_meta: {
        ...qualityPass.result.generation_meta,
        quality_issues: qualityPass.quality.issues,
        repaired: qualityPass.repaired,
      },
    };

    const now = new Date().toISOString();
    const { data: existing, error: existErr } = await supabase
      .from("ebook_sections")
      .select("id")
      .eq("project_id", project.id)
      .eq("outline_section_id", outlineSection.id)
      .maybeSingle();
    if (existErr) {
      await restoreAfterFailure();
      await refundLocalCharge("Refund section generate DB failure");
      return {
        error: jsonError(
          getSupabaseErrorMessage(existErr, "Failed to load section"),
          500,
          "db_error",
        ),
      };
    }

    let row: Record<string, unknown> | null = null;
    if (existing) {
      if (revisionSource) {
        const { data: fullExisting } = await supabase
          .from("ebook_sections")
          .select("id, project_id, title, content_html, word_count")
          .eq("id", existing.id)
          .maybeSingle();
        if (fullExisting && sectionHasReplaceableContent(fullExisting)) {
          const rev = await createSectionRevision(supabase, {
            section: {
              id: String(fullExisting.id),
              project_id: project.id,
              title: String(fullExisting.title),
              content_html: String(fullExisting.content_html ?? ""),
              word_count: Number(fullExisting.word_count ?? 0),
            },
            source: revisionSource,
          });
          if (!rev.ok) {
            console.error(
              "[sections/generate] revision snapshot failed",
              rev.error,
            );
          }
        }
      }

      const { data, error } = await supabase
        .from("ebook_sections")
        .update({
          title: written.title,
          content_html: written.content_html,
          word_count: written.word_count,
          status: "generated",
          position: outlineSection.position,
          generation_meta: written.generation_meta,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) {
        await restoreAfterFailure();
        await refundLocalCharge("Refund section generate DB failure");
        return { error: jsonError(error.message, 500, "db_error") };
      }
      row = data;
    } else {
      const { data, error } = await supabase
        .from("ebook_sections")
        .insert({
          project_id: project.id,
          outline_section_id: outlineSection.id,
          position: outlineSection.position,
          title: written.title,
          content_html: written.content_html,
          word_count: written.word_count,
          status: "generated",
          generation_meta: written.generation_meta,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error) {
        await restoreAfterFailure();
        await refundLocalCharge("Refund section generate DB failure");
        return { error: jsonError(error.message, 500, "db_error") };
      }
      row = data;
    }

    // Memory upsert is non-fatal after successful section persistence.
    const nextMemory = mergeWriterMetaIntoMemory({
      memory: generation_memory,
      section_id: outlineSection.id,
      section_summary: written.section_summary,
      meta: qualityPass.result.generation_meta,
    });
    const memResult = await upsertProjectGenerationMemory(
      supabase,
      project.id,
      nextMemory,
    );
    if (!memResult.ok) {
      console.error(
        "[sections/generate] generation memory upsert failed",
        memResult.error,
      );
    }

    {
      const errMsg = await markSectionStatus("generated");
      if (errMsg) {
        await restoreAfterFailure();
        await refundLocalCharge("Refund section generate DB failure");
        return { error: jsonError(errMsg, 500, "db_error") };
      }
    }

    const { count, error: countErr } = await supabase
      .from("ebook_sections")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .in("status", ["generated", "edited"]);
    if (countErr) {
      // Non-fatal for content persistence; still return section
      console.error(
        "[sections/generate] count failed",
        getSupabaseErrorMessage(countErr),
      );
    }

    const generated = count ?? 0;
    const total = project.total_sections || outlineSections.length || 1;
    const progress = Math.round((generated / total) * 100);
    const status = generated >= total ? "generated" : "generating";

    const { error: projDoneErr } = await supabase
      .from("projects")
      .update({
        sections_generated: generated,
        progress,
        status,
        updated_at: now,
      })
      .eq("id", project.id);
    if (projDoneErr) {
      console.error(
        "[sections/generate] project progress update failed",
        getSupabaseErrorMessage(projDoneErr),
      );
    }

    return {
      section: mapSection(row!),
      outlineSections,
    };
  } catch (err) {
    await restoreAfterFailure();
    await refundLocalCharge("Refund section generate failure");
    throw err;
  }
}
