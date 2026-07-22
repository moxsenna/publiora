// Project workflow — stage progression and readiness checks.

export type ProjectWorkflowStep =
  | "strategy"
  | "outline"
  | "write"
  | "review"
  | "publish";

export type WorkflowStepStatus =
  | "complete"
  | "current"
  | "available"
  | "blocked"
  | "needs_attention";

export type WorkflowCheckCategory =
  | "strategy"
  | "structure"
  | "content"
  | "offer"
  | "cta"
  | "publication";

export interface WorkflowBlocker {
  code: string;
  message: string;
  targetStep: ProjectWorkflowStep;
}

export interface WorkflowCheck {
  id: string;
  /** Alias used by newer quality checks; defaults to id when absent. */
  code?: string;
  label: string;
  title?: string;
  description?: string;
  severity: "pass" | "warning" | "blocker";
  category?: WorkflowCheckCategory;
  message?: string;
  targetStep?: ProjectWorkflowStep;
  action_step?: ProjectWorkflowStep;
  action_label?: string;
  section_id?: string;
  outline_section_id?: string;
}

export interface ProjectWorkflowState {
  recommendedStep: ProjectWorkflowStep;
  steps: Record<ProjectWorkflowStep, WorkflowStepStatus>;
  checks: WorkflowCheck[];
  blockers: WorkflowBlocker[];
  completedSectionCount: number;
  totalSectionCount: number;
  writingProgress: number;
  canPublish: boolean;
}

/** Newer alias used by quality review modules. */
export type ProjectWorkflowCheck = WorkflowCheck;
