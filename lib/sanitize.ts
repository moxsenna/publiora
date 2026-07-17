import DOMPurify from "isomorphic-dompurify";

/** Sanitize generated/edited HTML before persist or publish snapshot. */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "style"],
  });
}
