import { requireOwnedProject } from "@/lib/api/project-access";
import { jsonError } from "@/lib/api/errors";
import { runWriter } from "@/lib/ai/agents/writer";
import { chargeGeneration, grantCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import type { Outline, OutlineSection } from "@/types/outline";
import type { Section } from "@/types/section";
import { sanitizeHtml } from "@/lib/sanitize";

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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
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

    if (outlineErr) return jsonError(outlineErr.message, 500, "db_error");
    if (!outlineRow) return jsonError("Outline not found", 404, "not_found");
    if (!outlineRow.approved) {
      return jsonError(
        "Approve outline before generating sections",
        400,
        "outline_not_approved"
      );
    }

    const sections = (outlineRow.sections as OutlineSection[]) ?? [];

    // Generate all: sequential
    if (body?.all) {
      const results: Section[] = [];
      for (const os of sections) {
        const one = await generateOne({
          supabase,
          userId: user.id,
          project,
          outlineSection: os,
          outlineRow: outlineRow as unknown as Outline & Record<string, unknown>,
        });
        if ("error" in one) return one.error;
        results.push(one.section);
      }
      return Response.json(results);
    }

    const outlineSectionId = body?.outline_section_id;
    if (!outlineSectionId) {
      return jsonError("outline_section_id required", 400, "validation_error");
    }
    const os = sections.find((s) => s.id === outlineSectionId);
    if (!os) return jsonError("Outline section not found", 404, "not_found");

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
      project,
      outlineSection: os,
      outlineRow: outlineRow as unknown as Outline & Record<string, unknown>,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateOne(opts: {
  // Supabase client type is complex; keep loose for route helper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  project: {
    id: string;
    title: string;
    audience: string;
    tone: string;
    niche: string;
    total_sections: number;
  };
  outlineSection: OutlineSection;
  outlineRow: Outline & Record<string, unknown>;
  alreadyCharged?: boolean;
}): Promise<{ section: Section } | { error: Response }> {
  const { supabase, userId, project, outlineSection } = opts;
  /** True only when this helper charged; outer POST refunds when alreadyCharged. */
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
    // mark generating
    await supabase
      .from("projects")
      .update({ status: "generating", updated_at: new Date().toISOString() })
      .eq("id", project.id);

    // update outline section status in jsonb
    const outlineSections = [
      ...((opts.outlineRow.sections as OutlineSection[]) ?? []),
    ];
    const idx = outlineSections.findIndex((s) => s.id === outlineSection.id);
    if (idx >= 0) {
      outlineSections[idx] = { ...outlineSections[idx], status: "generating" };
      await supabase
        .from("outlines")
        .update({
          sections: outlineSections,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", project.id);
    }

    const writtenRaw = await runWriter({
      project: {
        title: project.title,
        audience: project.audience,
        tone: project.tone,
        niche: project.niche,
      },
      section: {
        title: outlineSection.title,
        summary: outlineSection.summary,
        key_points: outlineSection.key_points,
      },
    });

    const written = {
      ...writtenRaw,
      content_html: sanitizeHtml(writtenRaw.content_html),
      word_count: sanitizeHtml(writtenRaw.content_html)
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length,
    };

    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from("ebook_sections")
      .select("id")
      .eq("project_id", project.id)
      .eq("outline_section_id", outlineSection.id)
      .maybeSingle();

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

    if (idx >= 0) {
      outlineSections[idx] = { ...outlineSections[idx], status: "generated" };
      await supabase
        .from("outlines")
        .update({ sections: outlineSections, updated_at: now })
        .eq("project_id", project.id);
    }

    const { count } = await supabase
      .from("ebook_sections")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .in("status", ["generated", "edited"]);

    const generated = count ?? 0;
    const total = project.total_sections || outlineSections.length || 1;
    const progress = Math.round((generated / total) * 100);
    const status = generated >= total ? "generated" : "generating";

    await supabase
      .from("projects")
      .update({
        sections_generated: generated,
        progress,
        status,
        updated_at: now,
      })
      .eq("id", project.id);

    return { section: mapSection(row!) };
  } catch (err) {
    // generate-all: we charged here → refund. single-section: outer POST refunds.
    await refundLocalCharge("Refund section generate failure");
    throw err;
  }
}
