// Project-level ebook generation memory (advisory continuity).

export interface EbookGenerationMemory {
  version: 1;
  terminology: string[];
  examples_used: string[];
  frameworks_defined: string[];
  claims_or_numbers: string[];
  promises_made: string[];
  offer_mentions_total: number;
  section_summaries: Record<string, string>;
}

export const EMPTY_GENERATION_MEMORY: EbookGenerationMemory = {
  version: 1,
  terminology: [],
  examples_used: [],
  frameworks_defined: [],
  claims_or_numbers: [],
  promises_made: [],
  offer_mentions_total: 0,
  section_summaries: {},
};
