import { describe, expect, it } from "vitest";
import {
  buildRevisionInsert,
  sectionHasReplaceableContent,
} from "@/lib/section-revisions";

describe("section revisions helpers", () => {
  it("detects replaceable content", () => {
    expect(sectionHasReplaceableContent(null)).toBe(false);
    expect(sectionHasReplaceableContent({ content_html: "" })).toBe(false);
    expect(sectionHasReplaceableContent({ content_html: "<p></p>" })).toBe(
      false,
    );
    expect(
      sectionHasReplaceableContent({ content_html: "<p>Hello world</p>" }),
    ).toBe(true);
  });

  it("builds revision insert payload", () => {
    expect(
      buildRevisionInsert({
        section: {
          id: "s1",
          project_id: "p1",
          title: "T",
          content_html: "<p>x</p>",
          word_count: 1,
        },
        source: "before_regenerate",
      }),
    ).toEqual({
      section_id: "s1",
      project_id: "p1",
      title: "T",
      content_html: "<p>x</p>",
      word_count: 1,
      source: "before_regenerate",
    });
  });
});
