import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("SectionsPanel accessibility and safe errors", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/workspace/SectionsPanel.tsx"), "utf8");

  it("labels the section title and announces save state", () => {
    expect(source).toContain('aria-label="Judul bagian"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });

  it("gives mobile picker options selected semantics and 44px targets", () => {
    expect(source).toContain('role="option"');
    expect(source).toContain('aria-selected={active}');
    expect(source).toContain('min-h-11');
  });

  it("maps provider failures to safe UI copy", () => {
    expect(source).toContain("getUiErrorMessage");
    expect(source).not.toContain('e?.message ?? "Coba lagi."');
    expect(source).not.toContain("setReviewError(e?.message");
  });
});
