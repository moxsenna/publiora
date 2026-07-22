// Deterministic section quality gate (no AI).

import type { FormatContext } from "@/types/template";
import type {
  SectionQualityIssue,
  SectionQualityResult,
  WriterGenerationMeta,
} from "@/types/quality";
import {
  countHeadings,
  countOfferMentions,
  countWords,
  findUnsupportedClaimSnippets,
  firstNWords,
  hasChecklistLikeStructure,
  hasCtaLanguage,
  hasPhaseStructure,
  hasReflectionPrompt,
  isKeyPointProbablyCovered,
  jaccardSimilarity,
  looksLikeMarkdownDocument,
  stripHtml,
} from "@/lib/quality/text-analysis";

export type ValidateSectionInput = {
  section_id: string;
  content_html: string;
  /** Target words from outline estimated_words or format default. */
  target_words: number;
  key_points: string[];
  format_context: FormatContext;
  /** Previous section body for opening similarity. */
  previous_content_html?: string | null;
  offer_name?: string | null;
  /** True when this section is the final outline section. */
  is_final_section?: boolean;
  generation_meta?: WriterGenerationMeta | null;
  /** Original pre-sanitize length for unsafe_or_removed_content heuristic. */
  pre_sanitize_html?: string | null;
};

export function validateSectionContent(
  input: ValidateSectionInput,
): SectionQualityResult {
  const issues: SectionQualityIssue[] = [];
  const sectionId = input.section_id;
  const html = input.content_html ?? "";
  const plain = stripHtml(html);
  const actual_words = countWords(html);
  const target_words = Math.max(1, input.target_words || 700);
  const target_ratio = actual_words / target_words;

  const key_points = (input.key_points ?? []).filter(
    (k) => typeof k === "string" && k.trim().length > 0,
  );
  let covered = 0;
  for (const kp of key_points) {
    if (isKeyPointProbablyCovered(kp, plain)) covered += 1;
  }

  const offer_mentions =
    input.generation_meta?.offer_mention_count ??
    countOfferMentions(plain, input.offer_name);

  let opening_similarity: number | null = null;
  if (input.previous_content_html) {
    const curOpen = firstNWords(html, 80);
    const prevOpen = firstNWords(input.previous_content_html, 80);
    opening_similarity = jaccardSimilarity(curOpen, prevOpen);
  }

  // ---- blockers ----
  if (!plain.trim()) {
    issues.push({
      code: "empty_content",
      severity: "blocker",
      message: "Section content is empty.",
      section_id: sectionId,
      repair_instruction: "Write a full HTML section body with real content.",
    });
  }

  if (
    input.pre_sanitize_html &&
    stripHtml(input.pre_sanitize_html).length > 80 &&
    plain.length < stripHtml(input.pre_sanitize_html).length * 0.25
  ) {
    issues.push({
      code: "unsafe_or_removed_content",
      severity: "blocker",
      message: "Most content was removed by sanitization.",
      section_id: sectionId,
      repair_instruction:
        "Rewrite using only safe HTML tags (p, h2, h3, ul, ol, li, blockquote, strong, em).",
    });
  }

  if (looksLikeMarkdownDocument(html)) {
    issues.push({
      code: "markdown_document_in_html",
      severity: "blocker",
      message: "Content looks like Markdown, not HTML fragments.",
      section_id: sectionId,
      repair_instruction:
        "Return HTML fragments only (p/h2/h3/ul/ol/li), not Markdown.",
    });
  }

  if (actual_words > 0 && target_ratio < 0.45) {
    issues.push({
      code: "extremely_short",
      severity: "blocker",
      message: `Section is extremely short (${actual_words} words vs target ${target_words}).`,
      section_id: sectionId,
      details: { actual_words, target_words, target_ratio },
      repair_instruction: `Expand the section to at least ~${Math.round(target_words * 0.7)} words while covering key points.`,
    });
  }

  if (target_ratio > 1.8) {
    issues.push({
      code: "extremely_long",
      severity: "blocker",
      message: `Section is extremely long (${actual_words} words vs target ${target_words}).`,
      section_id: sectionId,
      details: { actual_words, target_words, target_ratio },
      repair_instruction: `Shorten the section toward ~${target_words} words without losing key points.`,
    });
  }

  if (opening_similarity != null && opening_similarity >= 0.88) {
    issues.push({
      code: "opening_too_similar_to_previous",
      severity: "blocker",
      message: "Opening is nearly identical to the previous section.",
      section_id: sectionId,
      details: { opening_similarity },
      repair_instruction:
        "Rewrite the opening so it continues uniquely from the previous section.",
    });
  }

  const qr = input.format_context.quality_rules;
  if (qr.requires_checklist_items && plain && !hasChecklistLikeStructure(html)) {
    issues.push({
      code: "missing_format_requirement",
      severity: "blocker",
      message: "Checklist format requires actionable list items.",
      section_id: sectionId,
      details: { requirement: "requires_checklist_items" },
      repair_instruction:
        "Add a scannable checklist (multiple <li> items with clear actions).",
    });
  }

  // ---- warnings ----
  if (actual_words > 0 && target_ratio < 0.7 && target_ratio >= 0.45) {
    issues.push({
      code: "under_target_words",
      severity: "warning",
      message: `Section is under target (${actual_words}/${target_words} words).`,
      section_id: sectionId,
      details: { actual_words, target_words, target_ratio },
      repair_instruction: "Expand with concrete steps and examples.",
    });
  } else if (target_ratio > 1.35 && target_ratio <= 1.8) {
    issues.push({
      code: "over_target_words",
      severity: "warning",
      message: `Section is over target (${actual_words}/${target_words} words).`,
      section_id: sectionId,
      details: { actual_words, target_words, target_ratio },
      repair_instruction: "Tighten prose; keep actions and key points.",
    });
  }

  if (key_points.length > 0 && covered === 0) {
    issues.push({
      code: "probable_missing_key_point",
      severity: "warning",
      message: "None of the key points appear covered.",
      section_id: sectionId,
      details: { key_points_total: key_points.length, covered: 0 },
      repair_instruction: `Cover these key points: ${key_points.join("; ")}`,
    });
  } else if (key_points.length > 0 && covered < key_points.length) {
    issues.push({
      code: "probable_missing_key_point",
      severity: "warning",
      message: `Only ${covered}/${key_points.length} key points appear covered.`,
      section_id: sectionId,
      details: { key_points_total: key_points.length, covered },
      repair_instruction: "Address each missing key point explicitly.",
    });
  }

  if (
    opening_similarity != null &&
    opening_similarity >= 0.72 &&
    opening_similarity < 0.88
  ) {
    issues.push({
      code: "opening_too_similar_to_previous",
      severity: "warning",
      message: "Opening is very similar to the previous section.",
      section_id: sectionId,
      details: { opening_similarity },
      repair_instruction: "Vary the opening; avoid repeating the prior intro.",
    });
  }

  if (offer_mentions >= 4) {
    issues.push({
      code: "offer_mentioned_too_often",
      severity: "warning",
      message: `Offer is mentioned ${offer_mentions} times in one section.`,
      section_id: sectionId,
      details: { offer_mentions },
      repair_instruction:
        "Reduce product mentions; keep focus on reader value.",
    });
  }

  const containsCta =
    input.generation_meta?.contains_cta ?? hasCtaLanguage(html);
  if (containsCta && input.is_final_section === false) {
    issues.push({
      code: "cta_in_non_final_section",
      severity: "warning",
      message: "CTA language appears in a non-final section.",
      section_id: sectionId,
      repair_instruction:
        "Move strong CTAs to the final section; keep soft bridges only.",
    });
  }

  const claims = findUnsupportedClaimSnippets(html);
  if (claims.length > 0) {
    issues.push({
      code: "suspicious_unsupported_claim",
      severity: "warning",
      message: "Possible unsupported claims or statistics detected.",
      section_id: sectionId,
      details: { snippets: claims },
      repair_instruction:
        "Remove or qualify unverified percentages, currency claims, and 'proven by research' language.",
    });
  }

  if (qr.requires_reflection_prompts && plain && !hasReflectionPrompt(html)) {
    issues.push({
      code: "format_structure_weak",
      severity: "warning",
      message: "Workbook-style reflection/exercise prompts are weak or missing.",
      section_id: sectionId,
      details: { requirement: "requires_reflection_prompts" },
      repair_instruction: "Add reflection questions or fillable exercises.",
    });
  }

  if (qr.requires_phase_structure && plain && !hasPhaseStructure(html)) {
    issues.push({
      code: "format_structure_weak",
      severity: "warning",
      message: "Phase/step structure expected by format is weak or missing.",
      section_id: sectionId,
      details: { requirement: "requires_phase_structure" },
      repair_instruction:
        "Organize with clear phases/steps: objective, actions, expected output.",
    });
  }

  // ---- info ----
  if (actual_words > 0 && target_ratio >= 0.7 && target_ratio < 0.85) {
    issues.push({
      code: "slightly_under_target",
      severity: "info",
      message: `Slightly under target words (${actual_words}/${target_words}).`,
      section_id: sectionId,
    });
  }
  if (target_ratio > 1.15 && target_ratio <= 1.35) {
    issues.push({
      code: "slightly_over_target",
      severity: "info",
      message: `Slightly over target words (${actual_words}/${target_words}).`,
      section_id: sectionId,
    });
  }
  if (plain && countHeadings(html) === 0 && actual_words > 200) {
    issues.push({
      code: "low_heading_count",
      severity: "info",
      message: "Section has no headings; scannability may suffer.",
      section_id: sectionId,
    });
  }

  const blockers = issues.filter((i) => i.severity === "blocker");
  return {
    passed: blockers.length === 0 && actual_words > 0,
    issues,
    metrics: {
      actual_words,
      target_words,
      target_ratio,
      key_points_total: key_points.length,
      key_points_probably_covered: covered,
      offer_mentions,
      opening_similarity,
    },
  };
}

export function qualityIssuesForRepair(
  result: SectionQualityResult,
): SectionQualityIssue[] {
  return result.issues.filter(
    (i) => i.severity === "blocker" || i.severity === "warning",
  );
}
