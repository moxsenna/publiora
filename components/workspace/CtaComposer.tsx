"use client";

import * as React from "react";
import { useGenerateCtas, useUpdateProject } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { Sparkles, Check, Megaphone, X } from "lucide-react";
import {
  type CtaGoal,
  type CtaSuggestion,
  CTA_URL_REQUIRED_GOALS,
  isValidCtaUrl,
} from "@/types/ai-suggestions";
import type { Project } from "@/types/project";

// ---------------------------------------------------------------------------
// Local label maps
// ---------------------------------------------------------------------------

const CTA_GOAL_LABELS: Record<CtaGoal, string> = {
  visit_product: "Visit Product Page",
  join_whatsapp: "Join WhatsApp Community",
  claim_bonus: "Claim Bonus / Download",
  buy_product: "Buy the Product",
  follow_creator: "Follow Creator",
  custom: "Custom CTA",
};

const CTA_GOAL_DESCRIPTIONS: Record<CtaGoal, string> = {
  visit_product: "Direct readers to your product or landing page.",
  join_whatsapp: "Invite readers to a WhatsApp group or community.",
  claim_bonus: "Offer a bonus resource or download.",
  buy_product: "Encourage a direct purchase.",
  follow_creator: "Grow your social following.",
  custom: "Define your own custom call-to-action.",
};

const PLACEMENT_LABELS = {
  ebook_end: "End of ebook",
  claim_page: "Claim page only",
  both: "Both",
} as const;

// ---------------------------------------------------------------------------
// CtaComposer
// ---------------------------------------------------------------------------

interface CtaComposerProps {
  projectId: string;
  project: Project;
}

export function CtaComposer({ projectId, project }: CtaComposerProps) {
  const generateCtas = useGenerateCtas();
  const updateProject = useUpdateProject();
  const pushToast = useUiStore((s) => s.pushToast);

  // Local state for the goal selector
  const [selectedGoal, setSelectedGoal] = React.useState<CtaGoal>(
    (project.cta_goal as CtaGoal) ?? "custom",
  );
  const [url, setUrl] = React.useState(project.cta_url ?? "");
  const [placement, setPlacement] = React.useState<"ebook_end" | "claim_page" | "both">("both");
  const [ctaText, setCtaText] = React.useState(project.final_cta ?? "");
  const [suggestions, setSuggestions] = React.useState<CtaSuggestion[]>([]);
  const [appliedGoal, setAppliedGoal] = React.useState<CtaGoal | null>(
    (project.cta_goal as CtaGoal) ?? null,
  );

  // Sync when project changes externally
  React.useEffect(() => {
    if (project.cta_goal) {
      setSelectedGoal(project.cta_goal as CtaGoal);
      setAppliedGoal(project.cta_goal as CtaGoal);
    }
    if (project.cta_url !== null && project.cta_url !== undefined) {
      setUrl(project.cta_url);
    }
    if (project.final_cta) setCtaText(project.final_cta);
  }, [project.cta_goal, project.cta_url, project.final_cta]);

  const urlRequired = CTA_URL_REQUIRED_GOALS.includes(selectedGoal);
  const trimmedUrl = url.trim();
  // Required goals: empty or non-http(s) is invalid. Optional goals: empty OK.
  const urlValid = urlRequired
    ? trimmedUrl.length > 0 && isValidCtaUrl(trimmedUrl)
    : trimmedUrl.length === 0 || isValidCtaUrl(trimmedUrl);
  const urlError = urlRequired && !urlValid;

  // Generated suggestions
  const onGenerate = async () => {
    if (urlRequired && !urlValid) {
      pushToast({
        title: "URL required",
        description: "Enter a valid https:// destination before generating CTAs.",
        variant: "danger",
      });
      return;
    }
    try {
      const res = await generateCtas.mutateAsync({
        projectId,
        request: {
          goal: selectedGoal,
          destination_url: trimmedUrl.length > 0 ? trimmedUrl : null,
          placement,
          custom_instruction: null,
        },
      });
      setSuggestions(res.suggestions);
      pushToast({ title: "CTA suggestions generated", variant: "success" });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "insufficient_credits") {
        pushToast({
          title: "Not enough credits",
          description: "Open Billing to top up or upgrade your plan.",
          variant: "danger",
        });
        return;
      }
      pushToast({ title: "Failed to generate CTA suggestions", variant: "danger" });
    }
  };

  // Apply a suggestion
  const applySuggestion = async (s: CtaSuggestion) => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          cta_goal: s.goal,
          final_cta: s.text,
          cta_url: urlRequired ? (url || null) : null,
        },
      });
      setCtaText(s.text);
      setSelectedGoal(s.goal);
      setAppliedGoal(s.goal);
      pushToast({ title: "CTA applied", variant: "success" });
    } catch {
      pushToast({ title: "Failed to save CTA", variant: "danger" });
    }
  };

  // Save custom text
  const saveCta = async () => {
    if (urlRequired && !urlValid) {
      pushToast({ title: "Please enter a valid URL", variant: "danger" });
      return;
    }
    try {
      await updateProject.mutateAsync({
        id: projectId,
        patch: {
          cta_goal: selectedGoal,
          final_cta: ctaText || null,
          cta_url: trimmedUrl.length > 0 ? trimmedUrl : null,
        },
      });
      setAppliedGoal(selectedGoal);
      pushToast({ title: "CTA saved", variant: "success" });
    } catch {
      pushToast({ title: "Failed to save CTA", variant: "danger" });
    }
  };

  const currentSaved = project.final_cta;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-[var(--color-publiora-black)]" />
        <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
          Call to Action (CTA)
        </h3>
      </div>

      {/* Goal select */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-deep-gray)] mb-1.5">
          Goal
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {(Object.keys(CTA_GOAL_LABELS) as CtaGoal[]).map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => setSelectedGoal(goal)}
              className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                selectedGoal === goal
                  ? "border-[var(--color-publiora-black)] bg-[var(--color-surface-2)]"
                  : "border-[var(--color-publiora-border)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <span className="block font-medium text-[var(--color-deep-gray)]">
                {CTA_GOAL_LABELS[goal]}
              </span>
              <span className="block text-[10px] text-[var(--color-medium-gray)] mt-0.5">
                {CTA_GOAL_DESCRIPTIONS[goal]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* URL field (conditionally required) */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-deep-gray)] mb-1">
          Destination URL {urlRequired ? "(required)" : "(optional)"}
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={urlRequired ? "https://example.com" : "Optional URL"}
          className={`h-9 w-full rounded-[var(--radius-input)] border bg-white px-3 text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-medium-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)] transition-colors ${
            urlError
              ? "border-[var(--color-danger)]"
              : "border-[var(--color-publiora-border)]"
          }`}
        />
        {urlError && (
          <p className="text-xs text-[var(--color-danger)] mt-1">
            Please enter a valid HTTP or HTTPS URL.
          </p>
        )}
      </div>

      {/* CTA text editing */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-deep-gray)] mb-1">
          CTA Text
        </label>
        <textarea
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          placeholder="e.g. Download your free bonus guide now"
          rows={3}
          className="w-full rounded-[var(--radius-input)] border border-[var(--color-publiora-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-deep-gray)] placeholder:text-[var(--color-medium-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)] transition-colors resize-y"
        />
      </div>

      {/* Placement selector (for generation) */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-deep-gray)] mb-1.5">
          Placement (for suggestions)
        </label>
        <div className="flex gap-1.5">
          {(
            Object.entries(PLACEMENT_LABELS) as [
              "ebook_end" | "claim_page" | "both",
              string,
            ][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPlacement(val)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                placement === val
                  ? "border-[var(--color-publiora-black)] bg-[var(--color-surface-2)] text-[var(--color-deep-gray)]"
                  : "border-[var(--color-publiora-border)] text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions: generate + save */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onGenerate}
          loading={generateCtas.isPending}
          disabled={generateCtas.isPending || urlError}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate Suggestions
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={saveCta}
          loading={updateProject.isPending}
          disabled={urlError}
        >
          <Check className="h-3.5 w-3.5" />
          Save CTA
        </Button>
      </div>

      {/* Current saved CTA indicator */}
      {currentSaved && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-medium-gray)] bg-[var(--color-surface-2)] rounded-lg px-3 py-2 border border-[var(--color-publiora-border)]">
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span>
            Current:{" "}
            <span className="text-[var(--color-deep-gray)] font-medium">
              {currentSaved}
            </span>
            {appliedGoal && (
              <span className="ml-1 text-[var(--color-medium-gray)]">
                ({CTA_GOAL_LABELS[appliedGoal]})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Suggestion cards */}
      {generateCtas.isPending && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {!generateCtas.isPending && suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[var(--color-publiora-black)]">
            Suggestions
          </h4>
          {suggestions.map((s, i) => (
            <Card key={i}>
              <CardBody>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--color-deep-gray)]">
                      {s.text}
                    </span>
                    <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700">
                      {CTA_GOAL_LABELS[s.goal]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-medium-gray)]">
                    {s.placement !== "both"
                      ? `Placement: ${s.placement}`
                      : "Placement: end of ebook + claim page"}
                    {" \u2022 "}
                    {s.rationale}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applySuggestion(s)}
                      loading={updateProject.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Apply
                    </Button>
                    <CopyButton value={s.text} label="Copy" />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!generateCtas.isPending && suggestions.length === 0 && !currentSaved && (
        <p className="text-xs text-[var(--color-medium-gray)]">
          Configure a goal and click Generate to get AI-powered CTA
          suggestions based on your ebook content.
        </p>
      )}
    </div>
  );
}
