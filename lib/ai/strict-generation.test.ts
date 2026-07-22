import { describe, expect, it, vi } from "vitest";
import {
  StrictGenerationError,
  generateJsonWithSingleRepair,
  type ValidationIssue,
} from "@/lib/ai/strict-generation";

describe("generateJsonWithSingleRepair", () => {
  it("returns first attempt when valid", async () => {
    const firstAttempt = vi.fn(async () => ({ ok: true }));
    const repairAttempt = vi.fn(async () => ({ ok: false }));
    const result = await generateJsonWithSingleRepair({
      firstAttempt,
      validate: (raw) => {
        const r = raw as { ok: boolean };
        if (!r.ok) throw new Error("invalid");
        return r;
      },
      repairAttempt,
    });
    expect(result).toEqual({ ok: true });
    expect(firstAttempt).toHaveBeenCalledTimes(1);
    expect(repairAttempt).not.toHaveBeenCalled();
  });

  it("repairs once on first failure then succeeds", async () => {
    const firstAttempt = vi.fn(async () => ({ ok: false }));
    const repairAttempt = vi.fn(async () => ({ ok: true }));
    const result = await generateJsonWithSingleRepair({
      firstAttempt,
      validate: (raw) => {
        const r = raw as { ok: boolean };
        if (!r.ok) {
          const err = new Error("not ok") as Error & {
            issues: ValidationIssue[];
          };
          err.issues = [
            { path: "ok", code: "invalid", message: "must be true" },
          ];
          throw err;
        }
        return r;
      },
      repairAttempt,
    });
    expect(result).toEqual({ ok: true });
    expect(repairAttempt).toHaveBeenCalledTimes(1);
    const rawCall = repairAttempt.mock.calls[0] as unknown as
      | [ValidationIssue[]]
      | undefined;
    expect(rawCall?.[0]?.[0]?.code).toBe("invalid");
  });

  it("throws after repair still invalid", async () => {
    await expect(
      generateJsonWithSingleRepair({
        firstAttempt: async () => ({ ok: false }),
        validate: () => {
          throw new Error("still bad");
        },
        repairAttempt: async () => ({ ok: false }),
      }),
    ).rejects.toBeInstanceOf(StrictGenerationError);
  });
});
