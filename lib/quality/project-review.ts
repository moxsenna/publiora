// Deterministic project-level quality aggregation for Review dashboard.

import type { FormatContext } from "@/types/template";
import type { Outline } from "@/types/outline";
import type { Section } from "@/types/section";
import type { Project } from "@/types/project";
import type { EbookStrategy } from "@/types/strategy";
import type { ProjectOfferContext } from "@/types/offer";
import type { WorkflowCheck } from "@/types/workflow";
import { validateSectionContent } from "@/lib/quality/section-validator";
import {
  firstNWords,
  jaccardSimilarity,
  looksLikeMarkdownDocument,
} from "@/lib/quality/text-analysis";

export function buildSemanticReviewChecks(input: {
  project: Project;
  strategy: EbookStrategy;
  format_context: FormatContext;
  offer_context?: ProjectOfferContext | null;
  outline: Outline | null;
  sections: Section[];
}): WorkflowCheck[] {
  const checks: WorkflowCheck[] = [];
  const {
    project,
    strategy,
    format_context,
    offer_context,
    outline,
    sections,
  } = input;

  // Strategy
  if (!strategy.core_promise?.trim()) {
    checks.push({
      id: "promise_missing",
      code: "promise_missing",
      category: "strategy",
      label: "Janji inti belum diisi",
      title: "Janji inti belum diisi",
      severity: "warning",
      targetStep: "strategy",
      action_step: "strategy",
      action_label: "Buka Strategi",
    });
  }
  if (!strategy.unique_angle?.trim()) {
    checks.push({
      id: "unique_angle_missing",
      code: "unique_angle_missing",
      category: "strategy",
      label: "Sudut unik belum diisi",
      title: "Sudut unik belum diisi",
      severity: "warning",
      targetStep: "strategy",
      action_step: "strategy",
      action_label: "Buka Strategi",
    });
  }

  // Structure
  if (outline) {
    const count = outline.sections.length;
    const range = format_context.section_range;
    if (count < range.min || count > range.max) {
      checks.push({
        id: "section_count_out_of_range",
        code: "section_count_out_of_range",
        category: "structure",
        label: "Jumlah section di luar rentang format",
        title: "Jumlah section di luar rentang format",
        description: `Format ${format_context.format} mengharapkan ${range.min}–${range.max} section (saat ini ${count}).`,
        severity: "warning",
        targetStep: "outline",
        action_step: "outline",
        action_label: "Buka Outline",
      });
    }

    const titles = outline.sections.map((s) => s.title.trim().toLowerCase());
    if (new Set(titles.filter(Boolean)).size < titles.filter(Boolean).length) {
      checks.push({
        id: "duplicate_outline_titles",
        code: "duplicate_outline_titles",
        category: "structure",
        label: "Judul section outline duplikat",
        severity: "warning",
        targetStep: "outline",
        action_step: "outline",
      });
    }

    for (const os of outline.sections) {
      if (!os.key_points || os.key_points.length < 2) {
        checks.push({
          id: `key_points_missing_${os.id}`,
          code: "key_points_missing",
          category: "structure",
          label: `Key points kurang: ${os.title}`,
          severity: "warning",
          targetStep: "outline",
          outline_section_id: os.id,
          action_step: "outline",
        });
      }
    }
  }

  // Content quality per section
  const ordered = [...sections].sort((a, b) => a.position - b.position);
  for (let i = 0; i < ordered.length; i++) {
    const sec = ordered[i];
    const prev = i > 0 ? ordered[i - 1] : null;
    const outlineSec = outline?.sections.find(
      (os) => os.id === sec.outline_section_id,
    );
    const target =
      outlineSec?.estimated_words || format_context.default_target_words || 700;
    const result = validateSectionContent({
      section_id: sec.id,
      content_html: sec.content_html,
      target_words: target,
      key_points: outlineSec?.key_points ?? [],
      format_context,
      previous_content_html: prev?.content_html ?? null,
      offer_name: offer_context?.snapshot.name ?? null,
      is_final_section: i === ordered.length - 1,
    });

    for (const issue of result.issues) {
      if (issue.severity === "info") continue;
      checks.push({
        id: `${issue.code}_${sec.id}`,
        code: issue.code,
        category: "content",
        label: issue.message,
        title: issue.message,
        description: issue.repair_instruction,
        severity: issue.severity === "blocker" ? "warning" : "warning",
        // Content quality issues are warnings for publish unless empty.
        targetStep: "write",
        action_step: "write",
        action_label: "Buka section",
        section_id: sec.id,
        outline_section_id: sec.outline_section_id,
      });
    }

    if (looksLikeMarkdownDocument(sec.content_html)) {
      checks.push({
        id: `markdown_${sec.id}`,
        code: "markdown_document_in_html",
        category: "content",
        label: `Section "${sec.title}" tampak berisi Markdown`,
        severity: "warning",
        targetStep: "write",
        section_id: sec.id,
        outline_section_id: sec.outline_section_id,
        action_step: "write",
        action_label: "Buka section",
      });
    }

    if (prev) {
      const sim = jaccardSimilarity(
        firstNWords(sec.content_html, 80),
        firstNWords(prev.content_html, 80),
      );
      if (sim >= 0.72) {
        checks.push({
          id: `opening_sim_${sec.id}`,
          code: "repeated_opening",
          category: "content",
          label: `Pembukaan mirip section sebelumnya: ${sec.title}`,
          severity: "warning",
          targetStep: "write",
          section_id: sec.id,
          outline_section_id: sec.outline_section_id,
          action_step: "write",
          action_label: "Buka section",
        });
      }
    }
  }

  // Offer
  if (project.ebook_type === "bonus_product" && !offer_context) {
    checks.push({
      id: "bonus_missing_parent_offer",
      code: "bonus_missing_parent_offer",
      category: "offer",
      label: "Bonus belum terhubung ke produk induk",
      severity: "warning",
      targetStep: "strategy",
      action_step: "strategy",
    });
  }
  if (offer_context?.source_is_newer) {
    checks.push({
      id: "offer_snapshot_stale",
      code: "offer_snapshot_stale",
      category: "offer",
      label: "Snapshot produk lebih lama dari data terbaru",
      severity: "pass",
      message: "Informasional — snapshot tetap dipakai untuk ebook ini.",
      targetStep: "review",
    });
  }

  // CTA
  if (!project.cta_goal) {
    checks.push({
      id: "cta_goal_missing",
      code: "cta_goal_missing",
      category: "cta",
      label: "Tujuan CTA belum diisi",
      severity: "warning",
      targetStep: "review",
      action_step: "review",
    });
  }

  // Publication readiness hints
  if (!project.title?.trim()) {
    checks.push({
      id: "publication_title_missing",
      code: "publication_title_missing",
      category: "publication",
      label: "Judul project kosong",
      severity: "blocker",
      targetStep: "review",
      action_step: "review",
    });
  }
  return checks;
}

export function mergeWorkflowChecks(
  base: WorkflowCheck[],
  extra: WorkflowCheck[],
): WorkflowCheck[] {
  const seen = new Set(base.map((c) => c.id));
  const out = [...base];
  for (const c of extra) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}
