"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { useCreditCosts } from "@/lib/api/hooks";
import { apiFetch } from "@/lib/api/client";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { reviewId } from "@/lib/i18n/id/review";
import type { AiQualityReviewResult } from "@/types/quality-review";
import { useUiStore } from "@/store/projectStore";
import { Sparkles } from "lucide-react";

export function AiQualityReview({ projectId }: { projectId: string }) {
  const { data: costs } = useCreditCosts();
  const pushToast = useUiStore((s) => s.pushToast);
  const cost = costs?.quality_review ?? CREDIT_COSTS.quality_review;
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AiQualityReviewResult | null>(
    null,
  );

  const run = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiFetch<AiQualityReviewResult & { cost?: number }>(
        `/api/projects/${projectId}/quality-review`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setResult(res);
      pushToast({ title: "Analisis AI selesai", variant: "success" });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      pushToast({
        title:
          e?.code === "insufficient_credits"
            ? "Kredit tidak cukup"
            : "Analisis AI gagal",
        description: e?.message,
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-publiora-border)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
            Review semantik AI
          </h3>
          <p className="text-xs text-[var(--color-medium-gray)]">
            Opsional. Tidak mengubah konten secara otomatis.
          </p>
        </div>
        <Button size="sm" onClick={() => void run()} loading={loading}>
          <Sparkles className="h-3.5 w-3.5" />
          {reviewId.aiReview(cost)}
        </Button>
      </div>

      {result ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-deep-gray)]">{result.summary}</p>
          <ul className="space-y-2">
            {result.issues.map((issue, i) => (
              <li
                key={`${issue.title}-${i}`}
                className="rounded-lg bg-[var(--color-surface-2)] p-2 text-sm"
              >
                <div className="font-medium text-[var(--color-publiora-black)]">
                  {issue.title}{" "}
                  <span className="text-[11px] text-[var(--color-medium-gray)]">
                    ({issue.severity} · {issue.category})
                  </span>
                </div>
                <p className="text-xs text-[var(--color-deep-gray)] mt-1">
                  {issue.explanation}
                </p>
                <p className="text-xs text-[var(--color-medium-gray)] mt-1">
                  Saran: {issue.suggested_action}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
