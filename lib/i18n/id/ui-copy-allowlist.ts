import ts from "typescript";
import type { UiCopyDebtEntry } from "./ui-copy-debt";

export type UiCopyFinding = UiCopyDebtEntry;

export const forbiddenUiCopy = [
  "Dashboard",
  "Projects",
  "Library",
  "Billing",
  "New Project",
  "Workspace",
  "Published",
  "Sign out",
  "Password",
  "Section",
  "Reader",
  "Publish Now",
] as const;

export const uiCopyAllowlist = [
  "AI",
  "PDF",
  "EPUB",
  "DOCX",
  "URL",
  "email",
  "CTA",
  "template",
  "brief",
  "niche",
  "tone",
  "lead magnet",
  "QRIS",
  "e-wallet",
  "Virtual Account",
  "Publiora",
  "PayCore",
  "Duitku",
] as const;

const copyProperties = new Set([
  "label",
  "title",
  "description",
  "message",
  "helperText",
  "emptyText",
  "loadingText",
  "errorText",
]);
const copyAttributes = new Set(["aria-label", "title", "placeholder", "alt"]);
const excludedAttributes = new Set(["className", "id", "name", "href", "src"]);
const notificationCalls = /^(toast|notify|notification|pushToast|addToast|showToast)$/i;

function normalizePhrase(value: string): string {
  return value.replace(/[\\/]+/g, "/").replace(/\s+/g, " ").trim();
}

export function normalizeUiCopyPath(file: string, root = process.cwd()): string {
  const normalizedFile = file.replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
  return normalizedFile.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)
    ? normalizedFile.slice(normalizedRoot.length + 1)
    : normalizedFile.replace(/^\.\//, "");
}

function excludedFile(file: string): boolean {
  const path = normalizeUiCopyPath(file);
  return /(^|\/)app\/api\//.test(path)
    || /(^|\/)(__tests__|fixtures|generated)(\/|$)/.test(path)
    || /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
}

function staticText(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function forbiddenPhrase(value: string): string | null {
  const normalized = normalizePhrase(value);
  return forbiddenUiCopy.find((phrase) => normalized.includes(phrase)) ? normalized : null;
}

export function findForbiddenUiCopy(source: string, file: string): UiCopyFinding[] {
  const normalizedFile = normalizeUiCopyPath(file);
  if (excludedFile(normalizedFile)) return [];
  const sourceFile = ts.createSourceFile(normalizedFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: UiCopyFinding[] = [];

  const add = (value: string | null) => {
    if (value === null) return;
    const phrase = forbiddenPhrase(value);
    if (phrase) findings.push({ file: normalizedFile, phrase });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) add(node.text);

    if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent)) {
      add(staticText(node.expression));
    }

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      const excluded = excludedAttributes.has(name) || name.startsWith("data-") || /test.?id/i.test(name);
      if (!excluded && copyAttributes.has(name) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) add(node.initializer.text);
        if (ts.isJsxExpression(node.initializer)) add(staticText(node.initializer.expression));
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/["']/g, "");
      if (copyProperties.has(name)) add(staticText(node.initializer));
    }

    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(sourceFile).split(".").at(-1) ?? "";
      if (notificationCalls.test(name)) {
        for (const argument of node.arguments) add(staticText(argument));
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings.filter(
    (finding, index) => findings.findIndex(
      (candidate) => candidate.file === finding.file && candidate.phrase === finding.phrase,
    ) === index,
  );
}

export function validateUiCopyDebt(
  findings: readonly UiCopyFinding[],
  debt: readonly UiCopyDebtEntry[],
): string | null {
  const key = (entry: UiCopyDebtEntry) => `${normalizeUiCopyPath(entry.file)}\u0000${normalizePhrase(entry.phrase)}`;
  const debtKeys = debt.map(key);
  if (new Set(debtKeys).size !== debtKeys.length) return "duplicate UI copy debt entry";
  const findingKeys = new Set(findings.map(key));
  if (debtKeys.some((entry) => !findingKeys.has(entry))) return "stale UI copy debt entry";
  const debtSet = new Set(debtKeys);
  if (findings.some((entry) => !debtSet.has(key(entry)))) return "untracked forbidden UI copy";
  return null;
}
