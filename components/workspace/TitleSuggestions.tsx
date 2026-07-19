"use client";

import * as React from "react";
import { useGenerateTitles, useUpdateProject } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkles, Check, Heading } from "lucide-react";
import { TITLE_STYLES } from "@/types/agent";
import type { TitleSuggestion } from "@/types/ai-suggestions";

export function TitleSuggestions({ projectId }: { projectId: string }) {
  const generate = useGenerateTitles();
  const updateProject = useUpdateProject();
  const pushToast = useUiStore((s) => s.pushToast);

  const [suggestions, setSuggestions] = React.useState<TitleSuggestion[]>([]);
  const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null);

  const onGenerate = async () => {
    try {
      const res = await generate.mutateAsync(projectId);
      setSuggestions(res.suggestions);
      setSelectedTitle(null);
      pushToast({ title: "Title suggestions generated", variant: "success" });
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
      pushToast({
        title: "Failed to generate titles",
        variant: "danger",
      });
    }
  };

  const applyTitle = async (title: string) => {
    try {
      await updateProject.mutateAsync({ id: projectId, patch: { title } });
      setSelectedTitle(title);
      pushToast({ title: "Title applied to project", variant: "success" });
    } catch {
      pushToast({ title: "Failed to save title", variant: "danger" });
    }
  };

  const getStyleBadge = (style: string) => {
    const info = TITLE_STYLES.find((s) => s.id === style);
    return {
      label: info?.label ?? style,
      color:
        style === "curiosity"
          ? "bg-purple-100 text-purple-700"
          : style === "authority"
            ? "bg-blue-100 text-blue-700"
            : style === "practical"
              ? "bg-green-100 text-green-700"
              : style === "contrarian"
                ? "bg-orange-100 text-orange-700"
                : "bg-teal-100 text-teal-700",
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heading className="h-4 w-4 text-[var(--color-publiora-black)]" />
          <h3 className="text-sm font-semibold text-[var(--color-publiora-black)]">
            Title Suggestions
          </h3>
        </div>
        <Button size="sm" variant="outline" onClick={onGenerate} loading={generate.isPending} disabled={generate.isPending}>
          <Sparkles className="h-3.5 w-3.5" />
          Generate
        </Button>
      </div>

      {generate.isPending && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {!generate.isPending && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <Card key={i}>
              <CardBody>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--color-deep-gray)]">
                        {s.title}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStyleBadge(s.style).color}`}
                    >
                      {getStyleBadge(s.style).label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-medium-gray)]">
                    {s.rationale}
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedTitle === s.title ? (
                      <Badge variant="success">
                        <Check className="h-3 w-3" /> Applied
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyTitle(s.title)}
                        loading={updateProject.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Use this title
                      </Button>
                    )}
                    <CopyButton value={s.title} label="Copy" />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!generate.isPending && suggestions.length === 0 && (
        <p className="text-xs text-[var(--color-medium-gray)]">
          Click Generate to get AI-powered title suggestions based on your strategy.
        </p>
      )}
    </div>
  );
}
