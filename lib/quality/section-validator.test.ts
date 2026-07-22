import { describe, expect, it } from "vitest";
import { validateSectionContent } from "@/lib/quality/section-validator";
import { resolveFormatContext } from "@/lib/templates/format-context";

const checklist = resolveFormatContext({
  ebookType: "lead_magnet",
  templateId: "tpl_checklist",
});

function words(n: number, seed = "action"): string {
  return Array.from({ length: n }, (_, i) => `${seed}${i}`).join(" ");
}

function htmlParagraphs(nWords: number, extra = ""): string {
  return `<h2>Section</h2><p>${words(nWords)}</p>${extra}`;
}

describe("validateSectionContent", () => {
  it("blocks empty content", () => {
    const r = validateSectionContent({
      section_id: "s1",
      content_html: "",
      target_words: 500,
      key_points: ["Do the thing clearly"],
      format_context: checklist,
    });
    expect(r.passed).toBe(false);
    expect(r.issues.some((i) => i.code === "empty_content")).toBe(true);
  });

  it("blocks extremely short content", () => {
    const r = validateSectionContent({
      section_id: "s1",
      content_html: htmlParagraphs(50),
      target_words: 500,
      key_points: ["Map funnel stages carefully"],
      format_context: checklist,
    });
    expect(r.issues.some((i) => i.code === "extremely_short")).toBe(true);
    expect(r.passed).toBe(false);
  });

  it("blocks markdown artifacts", () => {
    const r = validateSectionContent({
      section_id: "s1",
      content_html: "# Title\n\n- one\n- two\n- three\n\n" + words(400),
      target_words: 400,
      key_points: ["one two three four five"],
      format_context: checklist,
    });
    expect(r.issues.some((i) => i.code === "markdown_document_in_html")).toBe(
      true,
    );
  });

  it("warns on missing key points", () => {
    const r = validateSectionContent({
      section_id: "s1",
      content_html:
        htmlParagraphs(400) +
        "<ul><li>do this</li><li>do that</li><li>do more</li></ul>",
      target_words: 400,
      key_points: ["Quantum teleportation protocol"],
      format_context: checklist,
    });
    expect(
      r.issues.some(
        (i) =>
          i.code === "probable_missing_key_point" && i.severity === "warning",
      ),
    ).toBe(true);
  });

  it("flags repeated openings", () => {
    const opening = Array.from({ length: 90 }, (_, i) => `sharedopen${i}`).join(
      " ",
    );
    const prev = `<p>${opening} ${words(200, "prev")}</p>`;
    const cur =
      `<h2>Next</h2><p>${opening} ${words(200, "cur")}</p>` +
      "<ul><li>a</li><li>b</li><li>c</li></ul>";
    const r = validateSectionContent({
      section_id: "s2",
      content_html: cur,
      target_words: 350,
      key_points: ["Build a simple weekly system"],
      format_context: checklist,
      previous_content_html: prev,
    });
    expect(
      r.issues.some((i) => i.code === "opening_too_similar_to_previous"),
    ).toBe(true);
  });

  it("warns CTA in non-final section", () => {
    const r = validateSectionContent({
      section_id: "s1",
      content_html:
        htmlParagraphs(400) +
        "<p>Beli sekarang dan daftar sekarang untuk akses.</p>" +
        "<ul><li>one</li><li>two</li><li>three</li></ul>",
      target_words: 400,
      key_points: ["one two three four five"],
      format_context: checklist,
      is_final_section: false,
    });
    expect(r.issues.some((i) => i.code === "cta_in_non_final_section")).toBe(
      true,
    );
  });

  it("warns unsupported claims", () => {
    const r = validateSectionContent({
      section_id: "s1",
      content_html:
        htmlParagraphs(400) +
        "<p>Riset menunjukkan 90% readers succeed. Rp 1.000.000.</p>" +
        "<ul><li>one</li><li>two</li><li>three</li></ul>",
      target_words: 400,
      key_points: ["one two three four five"],
      format_context: checklist,
    });
    expect(
      r.issues.some((i) => i.code === "suspicious_unsupported_claim"),
    ).toBe(true);
  });

  it("warns offer overuse", () => {
    const r = validateSectionContent({
      section_id: "s1",
      content_html:
        `<p>${"Main Course ".repeat(6)}${words(380)}</p>` +
        "<ul><li>one</li><li>two</li><li>three</li></ul>",
      target_words: 400,
      key_points: ["one two three four five"],
      format_context: checklist,
      offer_name: "Main Course",
    });
    expect(r.issues.some((i) => i.code === "offer_mentioned_too_often")).toBe(
      true,
    );
  });

  it("passes a reasonable checklist section", () => {
    const body =
      `<h2>Checklist</h2><p>${words(350)} map funnel stages carefully avoid traffic mistakes</p>` +
      "<ul><li>Map funnel stages carefully</li><li>Avoid traffic mistakes early</li><li>Ship weekly content</li></ul>";
    const r = validateSectionContent({
      section_id: "s1",
      content_html: body,
      target_words: 400,
      key_points: ["Map funnel stages carefully", "Avoid traffic mistakes early"],
      format_context: checklist,
      is_final_section: true,
    });
    expect(r.passed).toBe(true);
    expect(r.issues.every((i) => i.severity !== "blocker")).toBe(true);
  });
});
