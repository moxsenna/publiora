export type AiQualityIssueSeverity = "warning" | "important";

export interface AiQualityIssue {
  severity: AiQualityIssueSeverity;
  category: string;
  section_id: string | null;
  title: string;
  explanation: string;
  suggested_action: string;
}

export interface AiQualityReviewResult {
  summary: string;
  issues: AiQualityIssue[];
}
