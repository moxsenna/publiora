import { describe, expect, it } from "vitest";
import { safeParseJson } from "@/lib/ai/provider";

describe("safeParseJson", () => {
  it("parses clean standard JSON", () => {
    const input = JSON.stringify({
      title: "Section 1",
      content_html: "<p>Hello world</p>",
      word_count: 100,
    });
    const parsed = safeParseJson<{ title: string; content_html: string; word_count: number }>(input);
    expect(parsed.title).toBe("Section 1");
    expect(parsed.content_html).toBe("<p>Hello world</p>");
    expect(parsed.word_count).toBe(100);
  });

  it("strips markdown code blocks", () => {
    const input = "```json\n" + JSON.stringify({ key: "value" }) + "\n```";
    const parsed = safeParseJson<{ key: string }>(input);
    expect(parsed.key).toBe("value");
  });

  it("extracts json object surrounded by chatter text", () => {
    const input = `Tentu, ini hasil JSON untuk section Anda:
    {
      "title": "Bab 1",
      "content_html": "<p>Pembukaan</p>",
      "word_count": 50
    }
    Semoga membantu!`;
    const parsed = safeParseJson<{ title: string }>(input);
    expect(parsed.title).toBe("Bab 1");
  });

  it("repairs trailing commas", () => {
    const input = `{
      "title": "Bab 2",
      "items": [1, 2, 3,],
    }`;
    const parsed = safeParseJson<{ title: string; items: number[] }>(input);
    expect(parsed.title).toBe("Bab 2");
    expect(parsed.items).toEqual([1, 2, 3]);
  });

  it("recovers writer JSON when content_html has unescaped double quotes inside attributes and text", () => {
    // This replicates the exact production error: Expected ',' or '}' after property value in JSON
    const brokenInput = `{
      "title": "Komponen 2: Pilar Ide",
      "content_html": "<p class="lead">Mereka menyebutnya "growth hack" tercepat.</p><a href="https://example.com">Klik</a>",
      "word_count": 738,
      "section_summary": "Pilar ide untuk pertumbuhan.",
      "generation_meta": {
        "terms_defined": ["growth hack"],
        "examples_used": [],
        "frameworks_used": [],
        "claims_or_numbers": [],
        "offer_mention_count": 0,
        "contains_cta": false
      }
    }`;

    // Verify that standard JSON.parse fails on this input
    expect(() => JSON.parse(brokenInput)).toThrow();

    // safeParseJson recovers it via regex fallback
    const result = safeParseJson<{
      title: string;
      content_html: string;
      word_count: number;
      section_summary: string;
    }>(brokenInput);

    expect(result.title).toBe("Komponen 2: Pilar Ide");
    expect(result.content_html).toContain('<p class="lead">Mereka menyebutnya "growth hack" tercepat.</p>');
    expect(result.word_count).toBe(738);
    expect(result.section_summary).toBe("Pilar ide untuk pertumbuhan.");
  });

  it("throws clean localized Indonesian error on completely invalid/unrecoverable input", () => {
    expect(() => safeParseJson("This is not JSON at all.")).toThrow(
      "AI mengembalikan format JSON yang tidak valid atau terpotong. Silakan coba generate ulang section ini."
    );
  });
});
