import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runWriter } from "@/lib/ai/agents/writer";
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
    const strategyState = stateRow?.state_json
      ? normalizeProjectState(stateRow.state_json)
      : createEmptyProjectState();
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
      sectionIndex,
      alreadyCharged: true,
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
  sectionIndex: number;
  alreadyCharged?: boolean;
}): Promise<
  | { section: Section; outlineSections: OutlineSection[] }
  | { error: Response }
> {
  const { supabase, userId, project, outlineSection, strategy, sectionIndex } =
    opts;
  let outlineSections = [...opts.outlineSections];
  let chargedHere = false;

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

    // Mark current section generating on mutable copy, then persist
    if (sectionIndex >= 0) {
      outlineSections[sectionIndex] = {
        ...outlineSections[sectionIndex],
        status: "generating",
      };
      const { error: outGenErr } = await supabase
        .from("outlines")
        .update({
          sections: outlineSections,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", project.id);
      if (outGenErr) {
        await refundLocalCharge("Refund section generate DB failure");
        return {
          error: jsonError(
            getSupabaseErrorMessage(outGenErr, "Failed to update outline status"),
            500,
            "db_error",
          ),
        };
      }
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

    const writtenRaw = await runWriter({
      project: {
        title: project.title,
        audience: project.audience,
        tone: project.tone,
        niche: project.niche,
        ebook_type: project.ebook_type,
      },
      strategy,
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
    });

    const sanitized = sanitizeHtml(writtenRaw.content_html);
    const written = {
      ...writtenRaw,
      content_html: sanitized,
      word_count: sanitized
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length,
    };

    const now = new Date().toISOString();
    const { data: existing, error: existErr } = await supabase
      .from("ebook_sections")
      .select("id")
      .eq("project_id", project.id)
      .eq("outline_section_id", outlineSection.id)
      .maybeSingle();
    if (existErr) {
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
      const { data, error } = await supabase
        .from("ebook_sections")
        .update({
          title: written.title,
          content_html: written.content_html,
          word_count: written.word_count,
          status: "generated",
          position: outlineSection.position,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) {
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
          updated_at: now,
        })
        .select("*")
        .single();
      if (error) {
        await refundLocalCharge("Refund section generate DB failure");
        return { error: jsonError(error.message, 500, "db_error") };
      }
      row = data;
    }

    if (sectionIndex >= 0) {
      outlineSections[sectionIndex] = {
        ...outlineSections[sectionIndex],
        status: "generated",
      };
      const { error: outDoneErr } = await supabase
        .from("outlines")
        .update({ sections: outlineSections, updated_at: now })
        .eq("project_id", project.id);
      if (outDoneErr) {
        await refundLocalCharge("Refund section generate DB failure");
        return {
          error: jsonError(
            getSupabaseErrorMessage(outDoneErr, "Failed to finalize outline status"),
            500,
            "db_error",
          ),
        };
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
    await refundLocalCharge("Refund section generate failure");
    throw err;
  }
}
