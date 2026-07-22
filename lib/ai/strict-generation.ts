// Single-repair generation helper for strict AI JSON contracts.

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export class StrictGenerationError extends Error {
  readonly issues: ValidationIssue[];
  readonly attempts: number;

  constructor(message: string, issues: ValidationIssue[], attempts: number) {
    super(message);
    this.name = "StrictGenerationError";
    this.issues = issues;
    this.attempts = attempts;
  }
}

/**
 * Run firstAttempt, validate, and at most one repairAttempt when validation fails.
 * Does not charge credits — callers own billing.
 */
export async function generateJsonWithSingleRepair<T>(input: {
  firstAttempt: () => Promise<unknown>;
  validate: (raw: unknown) => T;
  repairAttempt: (issues: ValidationIssue[]) => Promise<unknown>;
}): Promise<T> {
  const firstRaw = await input.firstAttempt();
  try {
    return input.validate(firstRaw);
  } catch (firstErr) {
    const issues = issuesFromError(firstErr);
    const repairedRaw = await input.repairAttempt(issues);
    try {
      return input.validate(repairedRaw);
    } catch (secondErr) {
      const finalIssues = issuesFromError(secondErr);
      throw new StrictGenerationError(
        secondErr instanceof Error
          ? secondErr.message
          : "Generation failed validation after repair",
        finalIssues,
        2,
      );
    }
  }
}

export function issuesFromError(err: unknown): ValidationIssue[] {
  if (err instanceof StrictGenerationError) {
    return err.issues;
  }
  if (err && typeof err === "object" && "issues" in err) {
    const maybe = (err as { issues?: ValidationIssue[] }).issues;
    if (Array.isArray(maybe) && maybe.length > 0) {
      return maybe;
    }
  }
  if (err instanceof Error) {
    return [
      {
        path: "",
        code: "validation_error",
        message: err.message,
      },
    ];
  }
  return [
    {
      path: "",
      code: "validation_error",
      message: "Unknown validation error",
    },
  ];
}

export function formatIssuesForPrompt(issues: ValidationIssue[]): string {
  return issues
    .map((issue, i) => {
      const path = issue.path ? ` [${issue.path}]` : "";
      return `${i + 1}. (${issue.code})${path} ${issue.message}`;
    })
    .join("\n");
}
