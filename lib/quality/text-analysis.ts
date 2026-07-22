// Deterministic text helpers for section quality checks.

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "as",
  "at",
  "by",
  "from",
  "that",
  "this",
  "it",
  "its",
  "you",
  "your",
  "we",
  "our",
  "their",
  "dan",
  "yang",
  "untuk",
  "dengan",
  "dari",
  "pada",
  "ini",
  "itu",
  "atau",
  "adalah",
  "akan",
  "bisa",
  "juga",
  "ke",
  "di",
  "sebuah",
  "para",
  "agar",
  "lebih",
  "satu",
]);

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text: string): number {
  const plain = stripHtml(text);
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

export function normalizeText(text: string): string {
  return stripHtml(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s%-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function firstNWords(text: string, n: number): string {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  return words.slice(0, n).join(" ");
}

/** Jaccard similarity over token sets. */
export function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Conservative key-point coverage:
 * - distinctive multi-word phrase present, or
 * - token overlap >= threshold among non-stop tokens
 */
export function isKeyPointProbablyCovered(
  keyPoint: string,
  body: string,
  overlapThreshold = 0.45,
): boolean {
  const kpNorm = normalizeText(keyPoint);
  const bodyNorm = normalizeText(body);
  if (!kpNorm) return false;

  // Distinctive phrase: 3+ consecutive non-stop tokens from key point appear as phrase.
  const kpTokens = tokenize(keyPoint);
  if (kpTokens.length >= 2) {
    for (let len = Math.min(4, kpTokens.length); len >= 2; len--) {
      for (let i = 0; i <= kpTokens.length - len; i++) {
        const phrase = kpTokens.slice(i, i + len).join(" ");
        if (phrase.length >= 8 && bodyNorm.includes(phrase)) {
          return true;
        }
      }
    }
  } else if (kpTokens.length === 1 && kpTokens[0].length >= 6) {
    if (bodyNorm.includes(kpTokens[0])) return true;
  }

  const bodyTokens = new Set(tokenize(body));
  if (kpTokens.length === 0 || bodyTokens.size === 0) return false;
  let hit = 0;
  for (const t of kpTokens) {
    if (bodyTokens.has(t)) hit += 1;
  }
  return hit / kpTokens.length >= overlapThreshold;
}

export function countOfferMentions(
  body: string,
  offerName: string | null | undefined,
): number {
  if (!offerName?.trim()) return 0;
  const plain = normalizeText(body);
  const name = normalizeText(offerName);
  if (!name) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = plain.indexOf(name, idx);
    if (found < 0) break;
    count += 1;
    idx = found + name.length;
  }
  return count;
}

export function looksLikeMarkdownDocument(html: string): boolean {
  const trimmed = html.trim();
  if (!trimmed) return false;
  // Common markdown document artifacts when model returns MD instead of HTML.
  const mdSignals = [
    /^#{1,6}\s+\S/m,
    /^\s*[-*+]\s+\S/m,
    /```/,
    /\[.+\]\(.+\)/,
    /^\s*\d+\.\s+\S/m,
  ];
  const hasHtmlTag = /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em)\b/i.test(
    trimmed,
  );
  if (hasHtmlTag) return false;
  return mdSignals.some((re) => re.test(trimmed));
}

const UNSUPPORTED_CLAIM_PATTERNS: RegExp[] = [
  /\b\d{1,3}\s?%\b/,
  /\b(?:rp\.?|idr|usd|\$)\s?\d[\d.,]*/i,
  /\bterbukti\b/i,
  /\briset menunjukkan\b/i,
  /\bstudi membuktikan\b/i,
  /\bguaranteed\b/i,
  /\bdijamin\b/i,
  /\b100%\b/,
];

export function findUnsupportedClaimSnippets(body: string): string[] {
  const plain = stripHtml(body);
  const hits: string[] = [];
  for (const re of UNSUPPORTED_CLAIM_PATTERNS) {
    const m = plain.match(re);
    if (m?.[0]) hits.push(m[0]);
  }
  return [...new Set(hits)].slice(0, 8);
}

export function countHeadings(html: string): number {
  return (html.match(/<h[1-6]\b/gi) ?? []).length;
}

export function hasChecklistLikeStructure(html: string): boolean {
  const listItems = (html.match(/<li\b/gi) ?? []).length;
  const checkMarks = (html.match(/[☐☑✅✓]|\[ \]|\[x\]/gi) ?? []).length;
  return listItems >= 3 || checkMarks >= 2;
}

export function hasReflectionPrompt(html: string): boolean {
  const plain = normalizeText(html);
  return (
    /\b(refleksi|reflection|tuliskan|jawab|exercise|latihan|prompt|pertanyaan)\b/i.test(
      plain,
    ) || /\?\s*$/m.test(stripHtml(html))
  );
}

export function hasPhaseStructure(html: string): boolean {
  const plain = normalizeText(html);
  return /\b(fase|phase|langkah|step|tahap|stage)\s*\d+/i.test(plain) ||
    /<h[2-3][^>]*>\s*(fase|phase|langkah|step|tahap)/i.test(html);
}

export function hasCtaLanguage(html: string): boolean {
  const plain = normalizeText(html);
  return /\b(daftar sekarang|klik di sini|join now|beli sekarang|claim bonus|kunjungi|call to action|cta)\b/i.test(
    plain,
  );
}
