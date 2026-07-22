import type { EbookGenerationMemory } from "@/types/generation-memory";
import { EMPTY_GENERATION_MEMORY } from "@/types/generation-memory";
import type { WriterGenerationMeta } from "@/types/quality";

const LIMITS = {
  terminology: 50,
  examples: 50,
  frameworks: 30,
  claims: 50,
  promises: 30,
} as const;

function dedupeCap(items: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

export function emptyGenerationMemory(): EbookGenerationMemory {
  return {
    version: 1,
    terminology: [],
    examples_used: [],
    frameworks_defined: [],
    claims_or_numbers: [],
    promises_made: [],
    offer_mentions_total: 0,
    section_summaries: {},
  };
}

export function normalizeGenerationMemory(
  raw: unknown,
): EbookGenerationMemory {
  if (!raw || typeof raw !== "object") {
    return emptyGenerationMemory();
  }
  const o = raw as Record<string, unknown>;
  const section_summaries: Record<string, string> = {};
  if (o.section_summaries && typeof o.section_summaries === "object") {
    for (const [k, v] of Object.entries(
      o.section_summaries as Record<string, unknown>,
    )) {
      if (typeof v === "string" && v.trim()) {
        section_summaries[k] = v.trim().slice(0, 700);
      }
    }
  }

  return {
    version: 1,
    terminology: dedupeCap(
      Array.isArray(o.terminology)
        ? o.terminology.filter((x): x is string => typeof x === "string")
        : [],
      LIMITS.terminology,
    ),
    examples_used: dedupeCap(
      Array.isArray(o.examples_used)
        ? o.examples_used.filter((x): x is string => typeof x === "string")
        : [],
      LIMITS.examples,
    ),
    frameworks_defined: dedupeCap(
      Array.isArray(o.frameworks_defined)
        ? o.frameworks_defined.filter((x): x is string => typeof x === "string")
        : [],
      LIMITS.frameworks,
    ),
    claims_or_numbers: dedupeCap(
      Array.isArray(o.claims_or_numbers)
        ? o.claims_or_numbers.filter((x): x is string => typeof x === "string")
        : [],
      LIMITS.claims,
    ),
    promises_made: dedupeCap(
      Array.isArray(o.promises_made)
        ? o.promises_made.filter((x): x is string => typeof x === "string")
        : [],
      LIMITS.promises,
    ),
    offer_mentions_total: Math.max(
      0,
      Math.round(Number(o.offer_mentions_total) || 0),
    ),
    section_summaries,
  };
}

export function mergeWriterMetaIntoMemory(opts: {
  memory: EbookGenerationMemory;
  section_id: string;
  section_summary: string;
  meta: WriterGenerationMeta;
}): EbookGenerationMemory {
  const base = normalizeGenerationMemory(opts.memory);
  return {
    version: 1,
    terminology: dedupeCap(
      [...base.terminology, ...opts.meta.terms_defined],
      LIMITS.terminology,
    ),
    examples_used: dedupeCap(
      [...base.examples_used, ...opts.meta.examples_used],
      LIMITS.examples,
    ),
    frameworks_defined: dedupeCap(
      [...base.frameworks_defined, ...opts.meta.frameworks_used],
      LIMITS.frameworks,
    ),
    claims_or_numbers: dedupeCap(
      [...base.claims_or_numbers, ...opts.meta.claims_or_numbers],
      LIMITS.claims,
    ),
    promises_made: base.promises_made,
    offer_mentions_total:
      base.offer_mentions_total + Math.max(0, opts.meta.offer_mention_count),
    section_summaries: {
      ...base.section_summaries,
      [opts.section_id]: (opts.section_summary || "").trim().slice(0, 700),
    },
  };
}

/** Compact memory block for Writer prompts. */
export function formatMemoryForPrompt(
  memory: EbookGenerationMemory | null | undefined,
): string {
  const m = normalizeGenerationMemory(memory ?? EMPTY_GENERATION_MEMORY);
  const empty =
    m.terminology.length === 0 &&
    m.examples_used.length === 0 &&
    m.frameworks_defined.length === 0 &&
    m.claims_or_numbers.length === 0 &&
    Object.keys(m.section_summaries).length === 0;
  if (empty) {
    return "Generation memory: (empty — first sections in this project)";
  }

  const summaryLines = Object.entries(m.section_summaries)
    .slice(-8)
    .map(([id, s]) => `    - ${id}: ${s.slice(0, 160)}`);

  return [
    "Generation memory (avoid repeating examples/openings/terms inconsistently):",
    `  terminology: ${m.terminology.slice(0, 20).join(" | ") || "(none)"}`,
    `  examples_used: ${m.examples_used.slice(0, 15).join(" | ") || "(none)"}`,
    `  frameworks_defined: ${m.frameworks_defined.slice(0, 12).join(" | ") || "(none)"}`,
    `  claims_or_numbers: ${m.claims_or_numbers.slice(0, 12).join(" | ") || "(none)"}`,
    `  offer_mentions_total: ${m.offer_mentions_total}`,
    "  recent_section_summaries:",
    ...(summaryLines.length ? summaryLines : ["    (none)"]),
  ].join("\n");
}
