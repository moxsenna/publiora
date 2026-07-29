import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findForbiddenUiCopy,
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
    expect(findForbiddenUiCopy(source, "components/Example.tsx").map((x) => x.phrase)).toEqual(
      ["Dashboard", "Projects", "Billing", "Library", "New Project", "Sign out", "Publish Now"],
    );
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

  it("excludes API, tests, fixtures, and generated files", () => {
    const source = `export default () => <p>Dashboard</p>`;
    for (const file of [
      "app/api/demo/route.tsx",
      "x/demo.test.tsx",
      "x/demo.spec.tsx",
      "x/__tests__/demo.tsx",
      "fixtures/demo.tsx",
      "generated/demo.tsx",
    ]) {
      expect(findForbiddenUiCopy(source, file)).toEqual([]);
    }
  });

  it("normalizes Windows paths and repeated whitespace", () => {
    expect(normalizeUiCopyPath("D:\\Coding\\Publiora\\components\\Example.tsx", "D:\\Coding\\Publiora"))
      .toBe("components/Example.tsx");
    expect(findForbiddenUiCopy("const x = <p>New   \n Project</p>", "components/Example.tsx")[0]?.phrase)
      .toBe("New Project");
  });

  it("matches current UI findings to exact temporary debt", () => {
    const root = process.cwd();
    const files: string[] = [];
    const collect = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (["node_modules", ".next", ".git", ".worktrees"].includes(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) collect(absolute);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(absolute);
      }
    };
    for (const directory of ["app", "components", "lib"].map((name) => path.join(root, name))) {
      collect(directory);
    }
    const findings = files.flatMap((file) =>
      findForbiddenUiCopy(fs.readFileSync(file, "utf8"), normalizeUiCopyPath(file, root)),
    );
    expect(validateUiCopyDebt(findings, uiCopyDebt), JSON.stringify(findings, null, 2)).toBeNull();
  });

  it("rejects duplicate and stale exact debt entries", () => {
    const finding = { file: "components/Example.tsx", phrase: "Dashboard" };
    expect(validateUiCopyDebt([finding], [finding, finding])).toContain("duplicate");
    expect(validateUiCopyDebt([], [finding])).toContain("stale");
    expect(validateUiCopyDebt([finding], [finding])).toBeNull();
  });
});
