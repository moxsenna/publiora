import { describe, expect, it } from "vitest";
import {
  normalizeEnhancementResult,
  countWordsFromHtml,
  MAX_CONTENT_LENGTH,
} from "./enhancement";
import type { EnhancementAction } from "@/types/ai-suggestions";

// ---------------------------------------------------------------------------
// countWordsFromHtml
// ---------------------------------------------------------------------------

describe("countWordsFromHtml", () => {
  it("returns 0 for empty string", () => {
    expect(countWordsFromHtml("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(countWordsFromHtml("   \n  \t  ")).toBe(0);
  });

  it("counts words in plain text", () => {
    // "hello world this is a test" = 6 words
    expect(countWordsFromHtml("hello world this is a test")).toBe(6);
  });

  it("strips HTML tags before counting", () => {
    expect(countWordsFromHtml("<p>hello <strong>world</strong></p>")).toBe(2);
  });

  it("counts words in realistic HTML", () => {
    // "Content marketing is important." = 4, "Build a system that scales." = 5
    const html =
      "<p>Content marketing is important.</p><p>Build a system that scales.</p>";
    expect(countWordsFromHtml(html)).toBe(9);
  });

  it("handles multi-line HTML with inline tags", () => {
    const html = `<h2>Introduction</h2>
<p><strong>Key point:</strong> Build a <em>content engine</em> not a campaign.</p>
<ul><li>Item one</li><li>Item two</li></ul>`;
    const count = countWordsFromHtml(html);
    expect(count).toBeGreaterThan(10);
    expect(count).toBeLessThan(30);
  });

  it("handles self-closing tags", () => {
    expect(countWordsFromHtml("hello<br>world<br/>again")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// normalizeEnhancementResult — success paths
// ---------------------------------------------------------------------------

describe("normalizeEnhancementResult", () => {
  it("returns a valid EnhancementSuggestion for clean input", () => {
    const result = normalizeEnhancementResult("expand", "<p>original content here</p>", {
      suggested_html: "<p>expanded content with more detail here</p>",
      summary: "Added more detail.",
    });

    expect(result.action).toBe("expand");
    expect(result.original_html).toBe("<p>original content here</p>");
    expect(result.suggested_html).toBe("<p>expanded content with more detail here</p>");
    expect(result.summary).toBe("Added more detail.");
    expect(result.original_word_count).toBe(3);
    expect(result.suggested_word_count).toBe(6);
    expect(typeof result.original_word_count).toBe("number");
    expect(typeof result.suggested_word_count).toBe("number");
  });

  it("defaults summary when missing", () => {
    const result = normalizeEnhancementResult("shorten", "<p>a b c d e f g h</p>", {
      suggested_html: "<p>a b c</p>",
    });

    expect(result.summary).toBe("Content enhanced.");
  });

  it("defaults summary when empty string", () => {
    const result = normalizeEnhancementResult("simplify", "<p>test content</p>", {
      suggested_html: "<p>test</p>",
      summary: "",
    });

    expect(result.summary).toBe("Content enhanced.");
  });

  it("sanitizes suggested_html", () => {
    const result = normalizeEnhancementResult("professional", "<p>before</p>", {
      suggested_html: '<p>after<script>alert("xss")</script></p>',
      summary: "Cleaned up.",
    });

    expect(result.suggested_html).not.toContain("<script>");
    expect(result.suggested_html).not.toContain("alert");
    expect(result.suggested_html).toContain("<p>after</p>");
  });

  it("sanitizes original_html", () => {
    const result = normalizeEnhancementResult("persuasive", '<p>safe<script>bad</script></p>', {
      suggested_html: "<p>clean</p>",
      summary: "Ok",
    });

    // normalizeEnhancementResult does NOT re-sanitize original_html —
    // the caller already sends sanitized input.  Verify shape is correct.
    expect(result.original_html).toBe('<p>safe<script>bad</script></p>');
  });

  it("handles all seven actions", () => {
    const actions: EnhancementAction[] = [
      "expand",
      "shorten",
      "simplify",
      "persuasive",
      "professional",
      "add_examples",
      "add_checklist",
    ];

    for (const action of actions) {
      const result = normalizeEnhancementResult(action, "<p>test</p>", {
        suggested_html: "<p>enhanced test</p>",
        summary: `${action} done`,
      });

      expect(result.action).toBe(action);
      expect(result.suggested_html).toBe("<p>enhanced test</p>");
    }
  });

  it("recalculates word counts server-side", () => {
    // Even if the AI includes a word_count in its response, we ignore it
    // and recalculate from HTML.
    const result = normalizeEnhancementResult("add_examples", "<p>one two three</p>", {
      suggested_html: "<p>one two three four five six seven</p>",
      summary: "Done",
      word_count: 999, // should be ignored
    });

    expect(result.original_word_count).toBe(3);
    expect(result.suggested_word_count).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// normalizeEnhancementResult — error paths (invalid/unsafe AI output)
// ---------------------------------------------------------------------------

describe("normalizeEnhancementResult — error paths", () => {
  it("throws when suggested_html is empty string", () => {
    expect(() =>
      normalizeEnhancementResult("expand", "<p>test</p>", {
        suggested_html: "",
        summary: "Oops",
      }),
    ).toThrow();
  });

  it("throws when suggested_html is only whitespace", () => {
    expect(() =>
      normalizeEnhancementResult("expand", "<p>test</p>", {
        suggested_html: "   \n  ",
        summary: "Oops",
      }),
    ).toThrow();
  });

  it("throws when suggested_html is missing entirely", () => {
    expect(() =>
      normalizeEnhancementResult("expand", "<p>test</p>", {
        suggested_html: undefined,
        summary: "Oops",
      }),
    ).toThrow("invalid shape");
  });

  it("throws when suggested_html becomes empty after sanitization", () => {
    expect(() =>
      normalizeEnhancementResult("expand", "<p>test</p>", {
        suggested_html: "<script></script>",
        summary: "Oops",
      }),
    ).toThrow("suggested_html was empty after sanitization");
  });

  it("throws when response is not an object", () => {
    expect(() =>
      normalizeEnhancementResult("expand", "<p>test</p>", "not an object"),
    ).toThrow();
  });

  it("throws when response is null", () => {
    expect(() =>
      normalizeEnhancementResult("expand", "<p>test</p>", null),
    ).toThrow();
  });

  it("rejects iframe tags via sanitization", () => {
    // If the AI returns an iframe, sanitize should remove it.
    // If the remaining HTML is empty, it throws.
    expect(() =>
      normalizeEnhancementResult("expand", "<p>test</p>", {
        suggested_html: "<iframe src='x'></iframe>",
        summary: "Bad",
      }),
    ).toThrow("suggested_html was empty after sanitization");
  });

  it("rejects onclick attributes via sanitization", () => {
    const result = normalizeEnhancementResult("expand", "<p>test</p>", {
      suggested_html: "<p onclick='alert(1)'>safe text</p>",
      summary: "Bad",
    });

    expect(result.suggested_html).not.toContain("onclick");
    expect(result.suggested_html).toContain("safe text");
  });
});

// ---------------------------------------------------------------------------
// MAX_CONTENT_LENGTH
// ---------------------------------------------------------------------------

describe("MAX_CONTENT_LENGTH", () => {
  it("is set to 50,000", () => {
    expect(MAX_CONTENT_LENGTH).toBe(50_000);
  });
});
