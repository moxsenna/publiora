"use client";

import * as React from "react";
import {
  useOutline,
  useGenerateOutline,
  useUpdateOutline,
  useApproveOutline,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  ListTree,
} from "lucide-react";
import type { OutlineSection } from "@/types/outline";

export function OutlinePanel({ projectId }: { projectId: string }) {
  const { data: outline, isLoading } = useOutline(projectId);
  const generate = useGenerateOutline();
  const update = useUpdateOutline();
  const approve = useApproveOutline();
  const pushToast = useUiStore((s) => s.pushToast);

  const onGenerate = async () => {
    try {
      await generate.mutateAsync({ projectId });
      pushToast({ title: "Outline dibuat", variant: "success" });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "insufficient_credits") {
        pushToast({
          title: "Kredit tidak cukup",
          description: "Buka Billing untuk top-up atau upgrade plan.",
          variant: "danger",
        });
        return;
      }
      pushToast({
        title: e?.message?.includes("exists") ? "Outline sudah ada" : "Generate gagal",
        variant: "danger",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-10" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ListTree className="h-6 w-6" />}
          title="Outline belum dibuat"
          description="Planner agent akan menyusun outline dari brief project."
          action={
            <Button onClick={onGenerate} loading={generate.isPending}>
              <Sparkles className="h-4 w-4" />
              Generate outline
            </Button>
          }
        />
      </div>
    );
  }

  const onApprove = async () => {
    try {
      await approve.mutateAsync(projectId);
      pushToast({ title: "Outline approved. Section dapat di-generate.", variant: "success" });
    } catch {
      pushToast({ title: "Approve gagal", variant: "danger" });
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    if (!outline) return;
    const next = [...outline.sections];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    // fix positions
    next.forEach((s, k) => (s.position = k + 1));
    update.mutate({ projectId, patch: { sections: next } });
  };

  const updateSection = (id: string, patch: Partial<OutlineSection>) => {
    if (!outline) return;
    const next = outline.sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
    update.mutate({ projectId, patch: { sections: next } });
  };

  const remove = (id: string) => {
    if (!outline) return;
    const next = outline.sections
      .filter((s) => s.id !== id)
      .map((s, k) => ({ ...s, position: k + 1 }));
    update.mutate({ projectId, patch: { sections: next } });
  };

  const add = () => {
    if (!outline) return;
    const ns: OutlineSection = {
      id: "new_" + Math.random().toString(36).slice(2, 8),
      position: outline.sections.length + 1,
      title: "New section",
      summary: "",
      key_points: [],
      estimated_words: 600,
      status: "pending",
    };
    update.mutate({ projectId, patch: { sections: [...outline.sections, ns] } });
  };

  return (
    <div className="p-5 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-publiora-black)]">{outline.title}</h2>
            {outline.approved ? (
              <Badge variant="success">
                <Check className="h-3 w-3" /> Approved
              </Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
          </div>
          <p className="text-sm text-[var(--color-medium-gray)] mt-1">{outline.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={add}>
            <Plus className="h-4 w-4" /> Section
          </Button>
          {!outline.approved && (
            <Button size="sm" onClick={onApprove} loading={approve.isPending}>
              Approve outline
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {outline.sections.map((s, i) => (
          <Card key={s.id}>
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    onClick={() => move(i, -1)}
                    className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-[var(--color-publiora-black)]">{i + 1}</span>
                  <button
                    onClick={() => move(i, 1)}
                    className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <Input
                    value={s.title}
                    onChange={(e) => updateSection(s.id, { title: e.target.value })}
                    placeholder="Section title"
                  />
                  <Textarea
                    value={s.summary}
                    onChange={(e) => updateSection(s.id, { summary: e.target.value })}
                    rows={2}
                    placeholder="Ringkasan isi section"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-medium-gray)]">
                      ~{s.estimated_words} words
                    </span>
                    <SectionStatusBadge status={s.status} />
                  </div>
                </div>
                <button
                  onClick={() => remove(s.id)}
                  className="text-[var(--color-medium-gray)] hover:text-[var(--color-danger)] pt-1"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SectionStatusBadge({ status }: { status: OutlineSection["status"] }) {
  const map: Record<string, { variant: "default" | "warning" | "info" | "success" | "danger"; label: string }> = {
    pending: { variant: "default", label: "Pending" },
    generating: { variant: "info", label: "Generating" },
    generated: { variant: "success", label: "Generated" },
    failed: { variant: "danger", label: "Failed" },
  };
  const m = map[status] ?? map.pending;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
