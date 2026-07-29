import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/workspace/SectionsPanel.tsx"),
  "utf8",
);

describe("SectionsPanel quality blockers", () => {
  it("uses native mobile section selection and no nested interactive row", () => {
    expect(source).toMatch(/<select\s+aria-label="Pilih bagian"/);
    expect(source).not.toContain('role="option"');
    const sectionList = source.slice(
      source.indexOf("const sectionList"),
      source.indexOf("  return (", source.indexOf("const sectionList")),
    );
    expect(sectionList).not.toMatch(/<button(?:(?!<\/button>)[\s\S])*?<Button/);
    expect(source).toContain('aria-current={active ? "true" : undefined}');
  });

  it("guards sequential start in parent", () => {
    expect(source).toContain("if (insufficient) return;");
    expect(source).toContain("void sequential.start();");
  });

  it("blocks overwrite when revision snapshot fails", () => {
    expect(source).toContain("if (!revisionResponse.ok)");
    expect(source).toContain("throw new Error(\"revision_snapshot_failed\")");
  });

  it("keeps accepted undo outside closed review dialog with returned timestamp", () => {
    expect(source).toContain("setAcceptedUndo({");
    expect(source).toContain("acceptedUpdatedAt: saved.updated_at");
    expect(source).toContain("Urungkan penerapan");
    expect(source).toContain("expected_updated_at: acceptedUndo.acceptedUpdatedAt");
  });
});
