import { describe, expect, it } from "vitest";
import {
  countOfferMentions,
  countWords,
  findUnsupportedClaimSnippets,
  isKeyPointProbablyCovered,
  jaccardSimilarity,
  looksLikeMarkdownDocument,
} from "@/lib/quality/text-analysis";

describe("text-analysis", () => {
  it("counts words from HTML", () => {
    expect(countWords("<p>one two three</p>")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("detects markdown document artifacts", () => {
    expect(looksLikeMarkdownDocument("# Title\n\n- item")).toBe(true);
    expect(
      looksLikeMarkdownDocument("<p>Real <strong>HTML</strong> content</p>"),
    ).toBe(false);
  });

  it("covers key points via phrase/overlap heuristic", () => {
    const body =
      "Readers should map the funnel stages carefully and avoid traffic mistakes early.";
    expect(
      isKeyPointProbablyCovered("Map the funnel stages", body),
    ).toBe(true);
    expect(isKeyPointProbablyCovered("Quantum entanglement proof", body)).toBe(
      false,
    );
  });

  it("computes opening similarity", () => {
    const a = "start with the same opening words about freelancing income problems today";
    const b = "start with the same opening words about freelancing income problems now";
    expect(jaccardSimilarity(a, b)).toBeGreaterThan(0.5);
  });

  it("counts offer mentions and flags claim snippets", () => {
    const html =
      "<p>Main Course helps. Main Course again. Riset menunjukkan 80% success. Rp 500.000.</p>";
    expect(countOfferMentions(html, "Main Course")).toBe(2);
    const claims = findUnsupportedClaimSnippets(html);
    expect(claims.length).toBeGreaterThan(0);
  });
});
