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
  strategyFieldLabel,
} from "@/lib/workflow/strategy-copy";
import type { EbookType } from "@/types/project";

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
  "traffic_source",
  "bonus_role",
  "usage_moment",
  "sales_positioning",
];

const ARRAY_KEYS: (keyof EbookStrategy)[] = [
  "pain_points",
  "content_pillars",
  "buyer_objections",
];

// ---------------------------------------------------------------------------
// Field grouping (plan §5.9)
// ---------------------------------------------------------------------------

interface FieldGroup {
  heading: string;
  /** Keys in display order within the group. */
  keys: (keyof EbookStrategy)[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    heading: "Fondasi ebook",
    keys: ["topic", "core_promise", "unique_angle"],
  },
  {
    heading: "Audiens dan masalah",
    keys: [
      "audience",
      "audience_sophistication",
      "primary_problem",
      "pain_points",
      "desired_outcome",
    ],
  },
  {
    heading: "Positioning",
    keys: ["content_pillars"],
  },
  {
    heading: "Funnel dan penawaran",
    keys: [
      "product_or_offer",
      "funnel_goal",
      "cta_goal",
      "traffic_source",
      "bonus_role",
      "usage_moment",
      "sales_positioning",
      "buyer_objections",
    ],
  },
  {
    heading: "Gaya penulisan",
    keys: ["tone"],
  },
];

// ---------------------------------------------------------------------------
// Fields that span full width (arrays, tone, audience_sophistication)
// ---------------------------------------------------------------------------

const FULL_WIDTH_KEYS = new Set<keyof EbookStrategy>([
  "tone",
  "audience_sophistication",
  "pain_points",
  "content_pillars",
  "buyer_objections",
]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StrategyFieldEditorProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  strategy: EbookStrategy;
  ebookType?: EbookType | null;
  /** Optional field key to focus when the editor opens. */
  initialField?: keyof EbookStrategy | null;
}

export function StrategyFieldEditor({
  open,
  onClose,
  projectId,
  strategy,
  ebookType,
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
      // one-item-per-line (plan preference)
      next[key] = Array.isArray(arr) ? arr.join("\n") : "";
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
      // one-item-per-line (plan preference)
      strategy_patch[key] = raw
        ? raw.split("\n").map((s) => s.trim()).filter(Boolean)
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
    return `Masukkan ${strategyFieldLabel(key, ebookType).toLowerCase()}`;
  };

  const visibleGroups = FIELD_GROUPS.map((group) => ({
    ...group,
    keys: group.keys.filter((key) => {
      if (key === "funnel_goal" && ebookType === "bonus_product") return false;
      if (key === "traffic_source" && ebookType !== "lead_magnet") return false;
      if (
        (key === "bonus_role" || key === "usage_moment") &&
        ebookType !== "bonus_product"
      ) {
        return false;
      }
      if (
        (key === "sales_positioning" || key === "buyer_objections") &&
        ebookType !== "sellable_ebook"
      ) {
        return false;
      }
      return true;
    }),
  })).filter((g) => g.keys.length > 0);

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
      <div className="space-y-6">
        {visibleGroups.map((group) => (
          <section key={group.heading} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-medium-gray)]">
              {group.heading}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.keys.map((key) => (
                <div
                  key={key}
                  className={FULL_WIDTH_KEYS.has(key) ? "sm:col-span-2" : ""}
                >
                  <Label htmlFor={`strat-field-${key}`}>
                    {strategyFieldLabel(key, ebookType)}
                  </Label>
                  {ARRAY_KEYS.includes(key) ? (
                    <Textarea
                      id={`strat-field-${key}`}
                      value={form[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                      rows={3}
                      placeholder={placeholderFor(key)}
                    />
                  ) : (
                    <Input
                      id={`strat-field-${key}`}
                      value={form[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={placeholderFor(key)}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
