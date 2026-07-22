// Deterministic section quality contracts.

export type QualitySeverity = "blocker" | "warning" | "info";

export interface SectionQualityIssue {
  code: string;
  severity: QualitySeverity;
  message: string;
  section_id: string;
  details?: Record<string, unknown>;
  repair_instruction?: string;
}

export interface SectionQualityMetrics {
  actual_words: number;
  target_words: number;
  target_ratio: number;
  key_points_total: number;
  key_points_probably_covered: number;
  offer_mentions: number;
  opening_similarity: number | null;
}

export interface SectionQualityResult {
  passed: boolean;
  issues: SectionQualityIssue[];
  metrics: SectionQualityMetrics;
}

export interface WriterGenerationMeta {
  terms_defined: string[];
  examples_used: string[];
  frameworks_used: string[];
  claims_or_numbers: string[];
  offer_mention_count: number;
  contains_cta: boolean;
}
