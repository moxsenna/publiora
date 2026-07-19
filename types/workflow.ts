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

export interface WorkflowBlocker {
  code: string;
  message: string;
  targetStep: ProjectWorkflowStep;
}

export interface WorkflowCheck {
  id: string;
  label: string;
  severity: "pass" | "warning" | "blocker";
  message?: string;
  targetStep?: ProjectWorkflowStep;
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
