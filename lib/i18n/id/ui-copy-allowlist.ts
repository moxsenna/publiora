import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { UiCopyDebtEntry } from "./ui-copy-debt";

export type UiCopyFinding = UiCopyDebtEntry & { text: string };

export const forbiddenUiCopy = [
  "Dashboard", "Projects", "Library", "Billing", "New Project", "Workspace",
  "Published", "Sign out", "Password", "Section", "Reader", "Publish Now",
  "Cancel", "Save", "Generate failed", "No outline yet", "Outline created",
  "Strategy not ready", "Regenerate and reset",
  "Generate an outline from your approved strategy.",
] as const;

export const uiCopyAllowlist = [
  "AI", "PDF", "EPUB", "DOCX", "URL", "email", "CTA", "template", "brief",
  "niche", "tone", "lead magnet", "QRIS", "e-wallet", "Virtual Account",
  "Publiora", "PayCore", "Duitku",
] as const;

const copyProperties = new Set([
  "label", "title", "description", "message", "helperText", "emptyText",
  "loadingText", "errorText",
]);
const copyAttributes = new Set(["aria-label", "title", "placeholder", "alt"]);
const excludedAttributes = new Set(["className", "id", "name", "href", "src"]);
const notificationCalls = /^(toast|notify|notification|pushToast|addToast|showToast)$/i;
const allowlistNormalized = new Set(uiCopyAllowlist.map(normalizeText));

function normalizeText(value: string): string {
  return value.replace(/[\\/]+/g, "/").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeUiCopyPath(file: string, root = process.cwd()): string {
  const normalizedFile = file.replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
  return normalizedFile.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)
    ? normalizedFile.slice(normalizedRoot.length + 1)
    : normalizedFile.replace(/^\.\//, "");
}

function excludedFile(file: string): boolean {
  const normalized = normalizeUiCopyPath(file);
  return /(^|\/)app\/api\//.test(normalized)
    || /(^|\/)(__tests__|fixtures|generated)(\/|$)/.test(normalized)
    || /\.(test|spec)\.[jt]sx?$/.test(normalized)
    || (/^lib\//.test(normalized) && !/^lib\/i18n\/id\//.test(normalized));
}

function staticText(node: ts.Node | undefined): string | null {
  return node && (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}

function canonicalMatches(text: string): string[] {
  if (allowlistNormalized.has(text)) return [];
  return forbiddenUiCopy.filter((phrase) => {
    const escaped = escapeRegExp(phrase).replace(/\\ /g, "\\s+");
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, "iu").test(text);
  });
}

export function findForbiddenUiCopy(source: string, file: string): UiCopyFinding[] {
  const normalizedFile = normalizeUiCopyPath(file);
  if (excludedFile(normalizedFile) || !/\.[jt]sx?$/.test(normalizedFile)) return [];
  const sourceFile = ts.createSourceFile(normalizedFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: UiCopyFinding[] = [];

  const add = (value: string | null, node: ts.Node) => {
    if (value === null) return;
    const text = normalizeText(value);
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    for (const matchedPhrase of canonicalMatches(text)) {
      findings.push({
        file: normalizedFile,
        matchedPhrase,
        text,
        line: position.line + 1,
        column: position.character + 1,
      });
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) add(node.text, node);
    if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent)) add(staticText(node.expression), node.expression ?? node);
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      const excluded = excludedAttributes.has(name) || name.startsWith("data-") || /test.?id/i.test(name);
      if (!excluded && copyAttributes.has(name) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) add(node.initializer.text, node.initializer);
        if (ts.isJsxExpression(node.initializer)) add(staticText(node.initializer.expression), node.initializer.expression ?? node.initializer);
      }
    }
    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/["']/g, "");
      if (copyProperties.has(name)) add(staticText(node.initializer), node.initializer);
    }
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(sourceFile).split(".").at(-1) ?? "";
      if (notificationCalls.test(name)) for (const argument of node.arguments) add(staticText(argument), argument);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return findings;
}

export function getUiCopySourceFiles(root: string): string[] {
  const files: string[] = [];
  const collect = (directory: string) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", ".next", ".git", ".worktrees", "__tests__", "fixtures", "generated"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(absolute);
      else if (/\.[jt]sx?$/.test(entry.name) && !/\.(test|spec)\.[jt]sx?$/.test(entry.name)) files.push(absolute);
    }
  };
  collect(path.join(root, "app"));
  collect(path.join(root, "components"));
  collect(path.join(root, "lib", "i18n", "id"));
  return files.sort();
}

export function validateUiCopyDebt(findings: readonly UiCopyFinding[], debt: readonly UiCopyDebtEntry[]): string | null {
  const key = (entry: UiCopyDebtEntry) =>
    `${normalizeUiCopyPath(entry.file)}\u0000${entry.matchedPhrase}\u0000${entry.line}\u0000${entry.column}`;
  const debtKeys = debt.map(key);
  if (new Set(debtKeys).size !== debtKeys.length) return "duplicate UI copy debt entry";
  const findingKeys = new Set(findings.map(key));
  if (debtKeys.some((entry) => !findingKeys.has(entry))) return "stale UI copy debt entry";
  const debtSet = new Set(debtKeys);
  if (findings.some((entry) => !debtSet.has(key(entry)))) return "untracked forbidden UI copy";
  return null;
}
