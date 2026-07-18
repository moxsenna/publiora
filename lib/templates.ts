// HTML renderer for ebook sections — converts published sections into a complete
// standalone HTML document, used for PDF/EPUB preview and export.

import type { PublishedEbook } from "@/types";

export function renderEbookHtml(ebook: PublishedEbook): string {
  const toc = ebook.sections
    .map(
      (s, i) =>
        `<li><a href="#section-${i + 1}">${escapeHtml(s.title)}</a></li>`
    )
    .join("");

  const body = ebook.sections
    .map(
      (s, i) =>
        `<section id="section-${i + 1}" class="chapter">` +
        `<h1>${escapeHtml(s.title)}</h1>` +
        s.content_html +
        `</section>`
    )
    .join("\n");

  const coverColor = ebook.cover_color;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(ebook.title)}</title>
<style>
  :root { --cover: ${coverColor}; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #171717;
    line-height: 1.85;
    margin: 0 auto;
    max-width: 720px;
    padding: 64px 32px;
  }
  .cover {
    background: var(--cover);
    color: #FAFAF8;
    min-height: 360px;
    padding: 56px 48px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-bottom: 48px;
  }
  .cover h1 {
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    color: #FAFAF8;
    font-size: 2.6rem;
    line-height: 1.1;
    margin: 0;
    letter-spacing: -0.02em;
  }
  .cover .author {
    margin-top: auto;
    font-family: Inter, system-ui, sans-serif;
    font-size: 0.95rem;
    opacity: 0.85;
  }
  .cover .subtitle {
    color: #E9D9A8;
    margin-top: 12px;
    font-size: 1.1rem;
  }
  .toc {
    border: 1px solid #E5E5E5;
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 48px;
    background: #FAFAF8;
  }
  .toc h2 {
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #A3A3A3;
    margin: 0 0 12px 0;
  }
  .toc ol { padding-left: 20px; margin: 0; color: #2563EB; }
  .toc li { margin-bottom: 6px; }
  .toc a { color: inherit; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }
  section.chapter { margin-bottom: 64px; page-break-after: always; }
  section.chapter h1 {
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    font-size: 1.875rem;
    color: #0A0A0A;
    margin: 0 0 24px 0;
    letter-spacing: -0.02em;
  }
  section.chapter p { margin: 0 0 16px 0; }
  blockquote {
    border-left: 3px solid #C8A24B;
    padding-left: 16px;
    margin: 16px 0;
    color: #404040;
    font-style: italic;
  }
  ul, ol { padding-left: 24px; }
  a { color: #2563EB; }
  hr { border: none; border-top: 1px solid #E5E5E5; margin: 32px 0; }
  @media print {
    body { padding: 16px; max-width: 100%; }
    .cover { page-break-after: always; }
  }
</style>
</head>
<body>
  <div class="cover">
    <div>
      <h1>${escapeHtml(ebook.title)}</h1>
      ${ebook.subtitle ? `<div class="subtitle">${escapeHtml(ebook.subtitle)}</div>` : ""}
    </div>
    <div class="author">by ${escapeHtml(ebook.author)}</div>
  </div>
  <div class="toc">
    <h2>Daftar Isi</h2>
    <ol>${toc}</ol>
  </div>
  ${body}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
