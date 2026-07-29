import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findForbiddenUiCopy,
  getUiCopySourceFiles,
  normalizeUiCopyPath,
  validateUiCopyDebt,
} from "./ui-copy-allowlist";
import { uiCopyDebt } from "./ui-copy-debt";

describe("Indonesian UI copy scanner", () => {
  it("finds visible JSX, accessibility attrs, notifications, and copy object props", () => {
    const source = [
      "export function Example() {",
      'toast("Dashboard");',
      'notify({ message: "Projects" });',
      'const copy = { helperText: "Billing", emptyText: "Library" };',
      'return <><h1>New Project</h1><button aria-label={"Sign out"} title={`Publish Now`}>OK</button></>;',
      "}",
    ].join("\n");
    expect(findForbiddenUiCopy(source, "components/Example.tsx").map((x) => x.matchedPhrase)).toEqual(
      ["Dashboard", "Projects", "Billing", "Library", "New Project", "Sign out", "Publish Now"],
    );
  });

  it("scans static custom JSX copy props", () => {
    const findings = findForbiddenUiCopy(
      'const x = <Card description="Generate an outline from your approved strategy." label={`Save`} />',
      "components/Props.tsx",
    );
    expect(findings.map((finding) => finding.matchedPhrase)).toEqual([
      "Generate an outline from your approved strategy.",
      "Save",
    ]);
  });

  it("gates common English UI markers without phrase registration", () => {
    expect(findForbiddenUiCopy("const x = <><p>Try again</p><p>Generate outline</p></>", "components/Markers.tsx")
      .map((finding) => finding.matchedPhrase)).toEqual(["Try again", "Generate"]);
    expect(findForbiddenUiCopy("const x = <><p>Coba lagi</p><p>lead magnet</p></>", "components/Id.tsx"))
      .toEqual([]);
  });

  it("allows only normalized exact allowlist strings", () => {
    expect(findForbiddenUiCopy("const x = <p>  lead   magnet </p>", "components/Allowed.tsx")).toEqual([]);
    expect(findForbiddenUiCopy("const x = <p>lead magnet Dashboard</p>", "components/Superset.tsx"))
      .toHaveLength(1);
  });

  it("matches forbidden phrases case-insensitively with boundaries and punctuation", () => {
    const findings = findForbiddenUiCopy(
      "const x = <><p>dashboard</p><p>PROJECTS!</p><p>pUbLiSh NoW.</p><p>Passwordless</p></>",
      "components/Casing.tsx",
    );
    expect(findings.map(({ matchedPhrase, text }) => ({ matchedPhrase, text }))).toEqual([
      { matchedPhrase: "Dashboard", text: "dashboard" },
      { matchedPhrase: "Projects", text: "PROJECTS!" },
      { matchedPhrase: "Publish Now", text: "pUbLiSh NoW." },
    ]);
  });

  it("keeps separate occurrences in one file by line and column", () => {
    const findings = findForbiddenUiCopy(
      "const x = <>\n<p>Dashboard</p>\n<p>Dashboard</p>\n</>",
      "components/Duplicate.tsx",
    );
    expect(findings).toHaveLength(2);
    expect(findings.map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 2, column: 4 },
      { line: 3, column: 4 },
    ]);
  });

  it("ignores code-only text, excluded attrs, comments, and dynamic templates", () => {
    const source = [
      'import Dashboard from "./Dashboard";',
      'export const Projects = "Projects";',
      '// "Billing"',
      'const identifier = "Library";',
      'const node = <div className="Dashboard" id="Projects" data-testid="Billing" href="/Library">{name}</div>;',
      'const dynamic = <span>{`Dashboard ${name}`}</span>;',
    ].join("\n");
    expect(findForbiddenUiCopy(source, "components/Negative.tsx")).toEqual([]);
  });

  it("excludes API, tests, fixtures, generated, and internal lib files", () => {
    const source = `export default () => <p>Dashboard</p>`;
    for (const file of [
      "app/api/demo/route.tsx",
      "x/demo.test.tsx",
      "x/demo.spec.tsx",
      "x/__tests__/demo.tsx",
      "fixtures/demo.tsx",
      "generated/demo.tsx",
      "lib/quality/section-validator.ts",
    ]) {
      expect(findForbiddenUiCopy(source, file)).toEqual([]);
    }
  });

  it("normalizes Windows paths and repeated whitespace", () => {
    expect(normalizeUiCopyPath("D:\\Coding\\Publiora\\components\\Example.tsx", "D:\\Coding\\Publiora"))
      .toBe("components/Example.tsx");
    expect(findForbiddenUiCopy("const x = <p>New   \n Project</p>", "components/Example.tsx")[0]?.text)
      .toBe("New Project");
  });

  it("matches current scoped UI findings to exact temporary debt", () => {
    const root = process.cwd();
    const findings = getUiCopySourceFiles(root).flatMap((file) =>
      findForbiddenUiCopy(fs.readFileSync(file, "utf8"), normalizeUiCopyPath(file, root)),
    );
    expect(validateUiCopyDebt(findings, uiCopyDebt), JSON.stringify(findings, null, 2)).toBeNull();
    expect(getUiCopySourceFiles(root).some((file) => file.includes(path.join("lib", "quality"))))
      .toBe(false);
  });

  it("rejects duplicate and stale exact debt entries", () => {
    const finding = {
      file: "components/Example.tsx",
      matchedPhrase: "Dashboard",
      text: "Dashboard",
      line: 1,
      column: 4,
    };
    expect(validateUiCopyDebt([finding], [finding, finding])).toContain("duplicate");
    expect(validateUiCopyDebt([], [finding])).toContain("stale");
    expect(validateUiCopyDebt([finding], [finding])).toBeNull();
  });
});
