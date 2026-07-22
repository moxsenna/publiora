"use client";

import * as React from "react";
import {
  useOutline,
  useGenerateOutline,
  useUpdateOutline,
  useApproveOutline,
  useStrategy,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TitleSuggestions } from "@/components/workspace/TitleSuggestions";
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  ListTree,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type { OutlineSection } from "@/types/outline";
import {
  outlineSaveStateLabel,
  useOutlineDraft,
} from "@/components/workspace/useOutlineDraft";

const MIN_SECTIONS_FOR_APPROVE = 3;

export function OutlinePanel({
  projectId,
  onContinueToWrite,
}: {
  projectId: string;
  onContinueToWrite?: () => void;
}) {
  const { data: outline, isLoading } = useOutline(projectId);
  const { data: strategy } = useStrategy(projectId);
  const generate = useGenerateOutline();
  const update = useUpdateOutline();
  const approve = useApproveOutline();
  const pushToast = useUiStore((s) => s.pushToast);

  // ---- Local state ----
  const [userInstruction, setUserInstruction] = React.useState("");
  const [regenerationDialogOpen, setRegenerationDialogOpen] = React.useState(false);

  const draft = useOutlineDraft({
    outline,
    debounceMs: 900,
    save: async (input) => {
      try {
        return await update.mutateAsync({
          projectId,
          patch: {
            sections: input.sections,
            expected_updated_at: input.expected_updated_at,
          },
        });
      } catch (err) {
        const e = err as { code?: string; status?: number; message?: string };
        const error = new Error(e?.message ?? "Save failed") as Error & {
          code?: string;
          status?: number;
        };
        error.code = e?.code;
        error.status = e?.status;
        throw error;
      }
    },
  });

  // ---- Computed ----
  const validSectionCount = React.useMemo(() => {
    return draft.sections.filter((s) => s.title && s.title.trim().length > 0)
      .length;
  }, [draft.sections]);

  const canApprove = !!(
    outline &&
    !outline.approved &&
    validSectionCount >= MIN_SECTIONS_FOR_APPROVE
  );

  // ---- Strategy summary for display ----
  const strategySummary = React.useMemo(() => {
    if (!strategy) return null;
    const s = strategy.state.strategy;
    const parts: string[] = [];
    if (s.topic) parts.push(s.topic);
    if (s.audience) parts.push(`for ${s.audience}`);
    if (s.core_promise) parts.push(s.core_promise);
    if (s.unique_angle) parts.push(s.unique_angle);
    return parts.length > 0 ? parts.join(" \u00B7 ") : null;
  }, [strategy]);

  // ---- Generate / Regenerate ----
  const onGenerate = async (confirmReset = false) => {
    try {
      await generate.mutateAsync({
        projectId,
        input: {
          user_instruction: userInstruction.trim() || undefined,
          confirm_reset_written_sections: confirmReset,
        },
      });
      pushToast({ title: "Outline created", variant: "success" });
      setRegenerationDialogOpen(false);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "strategy_not_ready") {
        pushToast({
          title: "Strategy not ready",
          description: "Complete the strategy before generating an outline.",
          variant: "danger",
        });
        return;
      }
      if (e?.code === "outline_regenerate_blocked") {
        setRegenerationDialogOpen(true);
        return;
      }
      if (e?.code === "insufficient_credits") {
        pushToast({
          title: "Not enough credits",
          description: "Open Billing to top up or upgrade your plan.",
          variant: "danger",
        });
        return;
      }
      pushToast({
        title: "Generate failed",
        variant: "danger",
      });
    }
  };

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-10" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  // ---- Empty state (no outline) ----
  if (!outline) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ListTree className="h-6 w-6" />}
          title="No outline yet"
          description="Generate an outline from your approved strategy."
          action={
            <div className="space-y-3 w-full max-w-sm">
              {/* Strategy summary */}
              {strategySummary && (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)] p-3 text-left">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-gold)]" />
                  <p className="text-xs text-[var(--color-deep-gray)]">{strategySummary}</p>
                </div>
              )}

              {/* Optional instruction */}
              <Textarea
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                rows={2}
                placeholder="Optional instruction for the outline generator (e.g. focus on beginner-friendly tone, add more examples)"
              />

              <Button
                onClick={() => onGenerate(false)}
                loading={generate.isPending}
                disabled={generate.isPending}
                className="w-full"
              >
                <Sparkles className="h-4 w-4" />
                Generate outline
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  // ---- Actions ----
  const onApprove = async () => {
    try {
      const flushed = await draft.flushSave();
      if (!flushed) {
        pushToast({
          title: "Simpan dulu",
          description: "Outline belum tersimpan. Coba lagi.",
          variant: "danger",
        });
        return;
      }
      await approve.mutateAsync(projectId);
      pushToast({
        title: "Outline disetujui. Lanjut ke Write.",
        variant: "success",
      });
    } catch {
      pushToast({ title: "Approve gagal", variant: "danger" });
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    draft.move(i, dir);
  };

  const updateSection = (id: string, patch: Partial<OutlineSection>) => {
    draft.updateSection(id, patch);
  };

  const remove = (id: string) => {
    draft.remove(id);
  };

  const add = () => {
    draft.add();
  };

  const saveLabel = outlineSaveStateLabel(draft.saveState);

  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      {/* ---- Header with title and approve/continue ---- */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-publiora-black)]">{outline.title}</h2>
            {outline.approved ? (
              <Badge variant="success">
                <Check className="h-3 w-3" /> Disetujui
              </Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
            {saveLabel ? (
              <span
                className="text-[11px] text-[var(--color-medium-gray)]"
                aria-live="polite"
              >
                {saveLabel}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-[var(--color-medium-gray)] mt-1">{outline.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {outline.approved ? (
            <Button size="sm" onClick={onContinueToWrite} disabled={!onContinueToWrite}>
              <ArrowRight className="h-4 w-4" />
              Lanjut ke Write
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={add}>
                <Plus className="h-4 w-4" /> Section
              </Button>
              <Button size="sm" onClick={onApprove} loading={approve.isPending} disabled={!canApprove}>
                Setujui outline
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ---- Approve hint when too few sections ---- */}
      {!outline.approved && validSectionCount < MIN_SECTIONS_FOR_APPROVE && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-2.5 text-xs text-[var(--color-deep-gray)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--color-gold)]" />
          <span>
            Add at least {MIN_SECTIONS_FOR_APPROVE} sections with titles to approve. Currently: {validSectionCount}.
          </span>
        </div>
      )}

      {/* ---- Regenerate bar ---- */}
      {!outline.approved && (
        <div className="flex items-center gap-2">
          <Textarea
            value={userInstruction}
            onChange={(e) => setUserInstruction(e.target.value)}
            rows={1}
            placeholder="Optional instruction for re-generating..."
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerate(false)}
            loading={generate.isPending}
            disabled={generate.isPending}
            className="shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Regenerate
          </Button>
        </div>
      )}

      {/* ---- Section list ---- */}
      <div className="space-y-3">
        {draft.sections.map((s, i) => (
          <Card key={s.id}>
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    onClick={() => move(i, -1)}
                    className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                    aria-label="Pindah ke atas"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-[var(--color-publiora-black)]">{i + 1}</span>
                  <button
                    onClick={() => move(i, 1)}
                    className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                    aria-label="Pindah ke bawah"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <Input
                    value={s.title}
                    onChange={(e) => updateSection(s.id, { title: e.target.value })}
                    placeholder="Judul section"
                  />
                  <Textarea
                    value={s.summary}
                    onChange={(e) => updateSection(s.id, { summary: e.target.value })}
                    rows={2}
                    placeholder="Ringkasan isi section"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-medium-gray)]">
                      ~{s.estimated_words} kata
                    </span>
                    <SectionStatusBadge status={s.status} />
                  </div>
                </div>
                <button
                  onClick={() => remove(s.id)}
                  className="text-[var(--color-medium-gray)] hover:text-[var(--color-danger)] pt-1"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* ---- Title Suggestions ---- */}
      <div className="border-t border-[var(--color-publiora-border)] pt-4">
        <TitleSuggestions projectId={projectId} />
      </div>

      {/* ---- Regeneration confirmation dialog ---- */}
      <Modal
        open={regenerationDialogOpen}
        onClose={() => setRegenerationDialogOpen(false)}
        title="Regenerate and reset written sections"
        description="This outline already has written section content. Regenerating will permanently delete all written sections. This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRegenerationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={generate.isPending}
              onClick={() => onGenerate(true)}
            >
              Regenerate and reset
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2 text-sm text-[var(--color-danger)]">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            All previously generated section content will be lost. Make sure you really want to
            regenerate the entire outline.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function SectionStatusBadge({ status }: { status: OutlineSection["status"] }) {
  const map: Record<string, { variant: "default" | "warning" | "info" | "success" | "danger"; label: string }> = {
    pending: { variant: "default", label: "Belum ditulis" },
    generating: { variant: "info", label: "Menulis…" },
    generated: { variant: "success", label: "Selesai ditulis" },
    failed: { variant: "danger", label: "Gagal" },
  };
  const m = map[status] ?? map.pending;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
