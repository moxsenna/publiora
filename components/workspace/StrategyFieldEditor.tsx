"use client";

import * as React from "react";
import { usePatchStrategy } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { EbookStrategy } from "@/types/strategy";
import {
  STRATEGY_COPY_ID,
  STRATEGY_FIELD_LABELS,
} from "@/lib/workflow/strategy-copy";

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

interface StrategyFieldEditorProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  strategy: EbookStrategy;
  /** Optional field key to focus when the editor opens. */
  initialField?: keyof EbookStrategy | null;
}

export function StrategyFieldEditor({
  open,
  onClose,
  projectId,
  strategy,
  initialField,
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

  // Auto-focus the initialField input when the editor opens
  React.useEffect(() => {
    if (!open || !initialField) return;
    // Small delay so the Modal has finished its open transition
    const id = setTimeout(() => {
      const el = document.getElementById(`strat-field-${initialField}`);
      if (el) {
        el.focus();
        // If it is a textarea (array fields), move cursor to end
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }
    }, 100);
    return () => clearTimeout(id);
  }, [open, initialField]);

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
      pushToast({ title: STRATEGY_COPY_ID.editorSaveSuccess, variant: "success" });
      onClose();
    } catch {
      pushToast({ title: STRATEGY_COPY_ID.editorSaveError, variant: "danger" });
    }
  };

  const placeholderFor = (key: keyof EbookStrategy): string => {
    if (ARRAY_KEYS.includes(key)) {
      return STRATEGY_COPY_ID.editorArrayPlaceholder;
    }
    return `Masukkan ${STRATEGY_FIELD_LABELS[key].toLowerCase()}`;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={STRATEGY_COPY_ID.editorTitle}
      description={STRATEGY_COPY_ID.editorDescription}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {STRATEGY_COPY_ID.editorCancel}
          </Button>
          <Button onClick={onSave} loading={patch.isPending}>
            {STRATEGY_COPY_ID.editorSave}
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
            <Label htmlFor={`strat-field-${key}`}>{STRATEGY_FIELD_LABELS[key]}</Label>
            <Input
              id={`strat-field-${key}`}
              value={form[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={placeholderFor(key)}
            />
          </div>
        ))}

        {ARRAY_KEYS.map((key) => (
          <div key={key} className="sm:col-span-2">
            <Label htmlFor={`strat-field-${key}`}>{STRATEGY_FIELD_LABELS[key]}</Label>
            <Textarea
              id={`strat-field-${key}`}
              value={form[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
              rows={3}
              placeholder={placeholderFor(key)}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
