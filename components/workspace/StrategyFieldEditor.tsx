"use client";

import * as React from "react";
import { usePatchStrategy } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { EbookStrategy } from "@/types/strategy";

// ---------------------------------------------------------------------------
// Known scalar & array fields (mirrors EbookStrategy type)
// ---------------------------------------------------------------------------

const SCALAR_KEYS: (keyof EbookStrategy)[] = [
  "topic",
  "audience",
  "audience_sophistication",
  "primary_problem",
  "desired_outcome",
  "core_promise",
  "unique_angle",
  "product_or_offer",
  "funnel_goal",
  "cta_goal",
  "tone",
];

const ARRAY_KEYS: (keyof EbookStrategy)[] = [
  "pain_points",
  "content_pillars",
];

const FIELD_LABELS: Record<keyof EbookStrategy, string> = {
  topic: "Topic",
  audience: "Audience",
  audience_sophistication: "Audience sophistication",
  primary_problem: "Primary problem",
  pain_points: "Pain points",
  desired_outcome: "Desired outcome",
  core_promise: "Core promise",
  unique_angle: "Unique angle",
  content_pillars: "Content pillars",
  product_or_offer: "Product / Offer",
  funnel_goal: "Funnel goal",
  cta_goal: "CTA goal",
  tone: "Tone",
};

interface StrategyFieldEditorProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  strategy: EbookStrategy;
}

export function StrategyFieldEditor({
  open,
  onClose,
  projectId,
  strategy,
}: StrategyFieldEditorProps) {
  const patch = usePatchStrategy();
  const pushToast = useUiStore((s) => s.pushToast);

  const [form, setForm] = React.useState<Record<string, string>>({});

  // Sync form to current strategy whenever opened
  React.useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const key of SCALAR_KEYS) {
      next[key] = (strategy[key] as string) ?? "";
    }
    for (const key of ARRAY_KEYS) {
      const arr = strategy[key] ?? [];
      next[key] = Array.isArray(arr) ? arr.join(", ") : "";
    }
    setForm(next);
  }, [open, strategy]);

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    const strategy_patch: Record<string, unknown> = {};

    for (const key of SCALAR_KEYS) {
      const v = (form[key] ?? "").trim();
      strategy_patch[key] = v || null;
    }
    for (const key of ARRAY_KEYS) {
      const raw = (form[key] ?? "").trim();
      strategy_patch[key] = raw
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    }

    try {
      await patch.mutateAsync({ projectId, strategy_patch });
      pushToast({ title: "Strategy fields saved", variant: "success" });
      onClose();
    } catch {
      pushToast({ title: "Failed to save fields", variant: "danger" });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Strategy Fields"
      description="Fill in the details that define your ebook strategy."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={patch.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SCALAR_KEYS.map((key) => (
          <div
            key={key}
            className={
              key === "tone" || key === "audience_sophistication"
                ? "sm:col-span-2"
                : ""
            }
          >
            <Label htmlFor={`strat-field-${key}`}>{FIELD_LABELS[key]}</Label>
            <Input
              id={`strat-field-${key}`}
              value={form[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={`Enter ${FIELD_LABELS[key].toLowerCase()}`}
            />
          </div>
        ))}

        {ARRAY_KEYS.map((key) => (
          <div key={key} className="sm:col-span-2">
            <Label htmlFor={`strat-field-${key}`}>{FIELD_LABELS[key]}</Label>
            <Textarea
              id={`strat-field-${key}`}
              value={form[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
              rows={3}
              placeholder={`Comma-separated values, e.g. item one, item two`}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
