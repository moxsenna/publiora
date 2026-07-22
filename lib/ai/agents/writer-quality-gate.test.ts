import { describe, expect, it, vi, beforeEach } from "vitest";
import * as provider from "@/lib/ai/provider";
import { runWriterWithQualityGate } from "./writer";
import { resolveFormatContext } from "@/lib/templates/format-context";
import type { WriterInput } from "./writer";

const format_context = resolveFormatContext({
  ebookType: "lead_magnet",
  templateId: "tpl_checklist",
});

function longHtml(n = 400): string {
  const words = Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
  return `<h2>Title</h2><p>${words}</p><ul><li>one action</li><li>two action</li><li>three action</li></ul>`;
}

function baseInput(): WriterInput {
  return {
    project: {
      title: "Ebook",
      audience: "A",
      tone: "practical",
      niche: "growth",
      ebook_type: "lead_magnet",
    },
    format_context,
    section: {
      id: "os1",
      title: "Core section",
      summary: "Do the work carefully with concrete steps for readers.",
      key_points: ["Map funnel stages carefully", "Avoid traffic mistakes early"],
      estimated_words: 400,
      position: 1,
    },
  };
}

function writerPayload(html: string) {
  return {
    title: "Core section",
    content_html: html,
    word_count: 10,
    section_summary:
      "This section walks through concrete checklist actions for the reader.",
    generation_meta: {
      terms_defined: [],
      examples_used: [],
      frameworks_used: [],
      claims_or_numbers: [],
      offer_mention_count: 0,
      contains_cta: false,
    },
  };
}

describe("runWriterWithQualityGate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("persists first result when quality passes (no repair)", async () => {
    const spy = vi
      .spyOn(provider, "completeJson")
      .mockResolvedValueOnce(writerPayload(longHtml(400)));

    const out = await runWriterWithQualityGate({
      input: baseInput(),
      sanitize: (h) => h,
      validate: () => ({
        passed: true,
        issues: [],
        metrics: {
          actual_words: 400,
          target_words: 400,
          target_ratio: 1,
          key_points_total: 2,
          key_points_probably_covered: 2,
          offer_mentions: 0,
          opening_similarity: null,
        },
      }),
    });

    expect(out.repaired).toBe(false);
    expect(out.quality.passed).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("repairs once when first has blockers then second passes", async () => {
    const spy = vi
      .spyOn(provider, "completeJson")
      .mockResolvedValueOnce(writerPayload("<p>too short</p>"))
      .mockResolvedValueOnce(writerPayload(longHtml(400)));

    let call = 0;
    const out = await runWriterWithQualityGate({
      input: baseInput(),
      sanitize: (h) => h,
      validate: () => {
        call += 1;
        if (call === 1) {
          return {
            passed: false,
            issues: [
              {
                code: "extremely_short",
                severity: "blocker",
                message: "too short",
                section_id: "os1",
                repair_instruction: "Expand content",
              },
            ],
            metrics: {
              actual_words: 2,
              target_words: 400,
              target_ratio: 0.01,
              key_points_total: 2,
              key_points_probably_covered: 0,
              offer_mentions: 0,
              opening_similarity: null,
            },
          };
        }
        return {
          passed: true,
          issues: [],
          metrics: {
            actual_words: 400,
            target_words: 400,
            target_ratio: 1,
            key_points_total: 2,
            key_points_probably_covered: 2,
            offer_mentions: 0,
            opening_similarity: null,
          },
        };
      },
    });

    expect(out.repaired).toBe(true);
    expect(out.quality.passed).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
    const repairUser = String(spy.mock.calls[1]?.[0]?.user ?? "");
    expect(repairUser).toMatch(/failed quality validation/i);
    expect(repairUser).toContain("extremely_short");
  });

  it("throws after both attempts fail blockers", async () => {
    vi.spyOn(provider, "completeJson").mockResolvedValue(
      writerPayload("<p>bad</p>"),
    );

    await expect(
      runWriterWithQualityGate({
        input: baseInput(),
        sanitize: (h) => h,
        validate: () => ({
          passed: false,
          issues: [
            {
              code: "extremely_short",
              severity: "blocker",
              message: "still short",
              section_id: "os1",
            },
          ],
          metrics: {
            actual_words: 1,
            target_words: 400,
            target_ratio: 0.01,
            key_points_total: 0,
            key_points_probably_covered: 0,
            offer_mentions: 0,
            opening_similarity: null,
          },
        }),
      }),
    ).rejects.toMatchObject({ code: "section_quality_failed" });
  });

  it("does not repair for warnings-only (persist first)", async () => {
    const spy = vi
      .spyOn(provider, "completeJson")
      .mockResolvedValueOnce(writerPayload(longHtml(400)));

    const out = await runWriterWithQualityGate({
      input: baseInput(),
      sanitize: (h) => h,
      validate: () => ({
        passed: true,
        issues: [
          {
            code: "under_target_words",
            severity: "warning",
            message: "a bit short",
            section_id: "os1",
          },
        ],
        metrics: {
          actual_words: 300,
          target_words: 400,
          target_ratio: 0.75,
          key_points_total: 2,
          key_points_probably_covered: 1,
          offer_mentions: 0,
          opening_similarity: null,
        },
      }),
    });

    expect(out.repaired).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
