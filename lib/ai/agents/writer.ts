import { completeJson } from "@/lib/ai/provider";
import { WRITER_SYSTEM } from "@/lib/ai/prompts";
import type { EbookStrategy } from "@/types/strategy";
import type { OutlineSection } from "@/types/outline";
import type { ProjectOfferContext } from "@/types/offer";
import type { FormatContext } from "@/types/template";

export type WriterNeighbor = {
  title: string;
  summary: string;
};

export type WriterInput = {
  project: {
    title: string;
    audience: string;
    tone: string;
    niche: string;
    ebook_type?: string;
  };
  /** Full normalized strategy when available. */
  strategy?: Partial<EbookStrategy> | null;
  /** Full outline titles for continuity (flat). */
  outlineSections?: Array<Pick<OutlineSection, "id" | "title" | "summary" | "position">>;
  section: {
    id?: string;
    title: string;
    summary: string;
    key_points: string[];
    estimated_words?: number;
    position?: number;
  };
  previousSection?: WriterNeighbor | null;
  nextSection?: WriterNeighbor | null;
  /** Optional short plain-text summary of already-written previous section body. */
  previousSectionBodySummary?: string | null;
  /** Safe offer snapshot fields only. */
  offer_context?: ProjectOfferContext | null;
  /** Resolved template/format rules controlling section shape. */
  format_context: FormatContext;
};

export type WriterResult = {
  title: string;
  content_html: string;
  word_count: number;
};

function line(label: string, value: string | null | undefined): string {
  return `  ${label}: ${value && String(value).trim() ? value : "(none)"}`;
}

export function buildWriterUserPrompt(input: WriterInput): string {
  const s = input.strategy ?? null;
  const oc = input.offer_context ?? null;
  const strategyBlock = s
    ? [
        "Strategy (primary source of truth):",
        line("topic", s.topic),
        line("audience", s.audience),
        line("audience_sophistication", s.audience_sophistication),
        line("primary_problem", s.primary_problem),
        line(
          "pain_points",
          Array.isArray(s.pain_points) && s.pain_points.length
            ? s.pain_points.join(" | ")
            : null,
        ),
        line("desired_outcome", s.desired_outcome),
        line("core_promise", s.core_promise),
        line("unique_angle", s.unique_angle),
        line(
          "content_pillars",
          Array.isArray(s.content_pillars) && s.content_pillars.length
            ? s.content_pillars.join(" | ")
            : null,
        ),
        line("product_or_offer", s.product_or_offer),
        line("funnel_goal", s.funnel_goal),
        line("cta_goal", s.cta_goal),
        line("tone", s.tone ?? input.project.tone),
        line("traffic_source", s.traffic_source),
        line("bonus_role", s.bonus_role),
        line("usage_moment", s.usage_moment),
        line("sales_positioning", s.sales_positioning),
        line(
          "buyer_objections",
          Array.isArray(s.buyer_objections) && s.buyer_objections.length
            ? s.buyer_objections.join(" | ")
            : null,
        ),
      ].join("\n")
    : "Strategy: (not available — use project metadata only)";

  const offerBlock = oc
    ? [
        "Offer context (accepted snapshot only — do not invent features):",
        line("relationship", oc.relationship),
        line("offer_name", oc.snapshot.name),
        line("ownership", oc.snapshot.ownership),
        line("primary_outcome", oc.snapshot.primary_outcome),
        line(
          "destination_url_present",
          oc.snapshot.destination_url ? "yes" : "no",
        ),
        "Name the offer only when useful. Avoid repetitive promotion. Affiliate wording must not claim ownership.",
      ].join("\n")
    : "Offer context: (none)";

  const outlineBlock =
    input.outlineSections && input.outlineSections.length
      ? [
          "Full outline (for continuity; write ONLY the current section):",
          ...input.outlineSections
            .slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map(
              (sec, i) =>
                `  ${sec.position ?? i + 1}. ${sec.title} — ${sec.summary || "(no summary)"}`,
            ),
        ].join("\n")
      : "";

  const prev = input.previousSection;
  const next = input.nextSection;
  const neighbors = [
    "Neighboring sections:",
    prev
      ? `  previous: ${prev.title} — ${prev.summary || "(no summary)"}`
      : "  previous: (none — this is the first section)",
    next
      ? `  next: ${next.title} — ${next.summary || "(no summary)"}`
      : "  next: (none — this is the last section)",
    input.previousSectionBodySummary
      ? `  previous_body_summary: ${input.previousSectionBodySummary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const fc = input.format_context;
  const targetWords =
    input.section.estimated_words ?? fc.default_target_words ?? 700;

  const formatBlock = [
    "Selected format (FormatContext — mandatory):",
    line("template_id", fc.template_id),
    line("format", fc.format),
    line("depth", fc.depth),
    line(
      "section_range",
      `min=${fc.section_range.min} preferred=${fc.section_range.preferred} max=${fc.section_range.max}`,
    ),
    line("default_target_words", String(fc.default_target_words)),
    line(
      "target_words_range",
      `min=${fc.target_words_range.min} max=${fc.target_words_range.max}`,
    ),
    "  structural_rules:",
    ...fc.structural_rules.map((r) => `    - ${r}`),
    "  section_output_expectations:",
    ...fc.section_output_expectations.map((r) => `    - ${r}`),
    "  quality_rules:",
    `    requires_action_steps: ${fc.quality_rules.requires_action_steps}`,
    `    requires_checklist_items: ${fc.quality_rules.requires_checklist_items}`,
    `    requires_reflection_prompts: ${fc.quality_rules.requires_reflection_prompts}`,
    `    requires_framework_components: ${fc.quality_rules.requires_framework_components}`,
    `    requires_phase_structure: ${fc.quality_rules.requires_phase_structure}`,
    `    theory_ratio_max: ${fc.quality_rules.theory_ratio_max ?? "null"}`,
  ].join("\n");

  return [
    "Project:",
    line("title", input.project.title),
    line("audience", input.project.audience),
    line("tone", input.project.tone),
    line("niche", input.project.niche),
    line("ebook_type", input.project.ebook_type),
    "",
    strategyBlock,
    "",
    offerBlock,
    "",
    formatBlock,
    "",
    outlineBlock,
    outlineBlock ? "" : null,
    neighbors,
    "",
    "Write this section only (HTML fragment, no full document):",
    line("title", input.section.title),
    line("summary", input.section.summary),
    line("key_points", JSON.stringify(input.section.key_points ?? [])),
    line("target_words", String(targetWords)),
    line(
      "position",
      input.section.position != null ? String(input.section.position) : null,
    ),
    "",
    `Shape this section for format "${fc.format}". Follow structural_rules and section_output_expectations above.`,
    "Rules reminder: do not re-introduce the whole ebook; continue from previous section; match tone and promise; never fabricate product capabilities.",
  ]
    .filter((x) => x !== null)
    .join("\n");
}

export async function runWriter(input: WriterInput): Promise<WriterResult> {
  const user = buildWriterUserPrompt(input);
  const result = await completeJson<WriterResult>({
    system: WRITER_SYSTEM,
    user,
  });
  if (!result.content_html?.trim()) {
    throw new Error("Writer returned empty content_html");
  }
  const word_count =
    result.word_count ||
    result.content_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean)
      .length;
  return {
    title: result.title || input.section.title,
    content_html: result.content_html,
    word_count,
  };
}
