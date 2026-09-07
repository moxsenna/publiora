"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingDots } from "@/components/ui/LoadingDots";
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  Trash2,
} from "lucide-react";
import type { OutlineSection } from "@/types/outline";
import { cn } from "@/lib/utils";

function SectionStatusBadge({ status }: { status: OutlineSection["status"] }) {
  const map: Record<
    string,
    {
      variant: "default" | "warning" | "info" | "success" | "danger";
      label: string;
    }
  > = {
    pending: { variant: "default", label: "Belum ditulis" },
    generating: { variant: "info", label: "Menulis…" },
    generated: { variant: "success", label: "Selesai ditulis" },
    failed: { variant: "danger", label: "Gagal" },
  };
  const m = map[status] ?? map.pending;
  return (
    <Badge variant={m.variant} className="inline-flex items-center gap-1.5">
      {status === "generating" && <LoadingDots size="sm" />}
      {m.label}
    </Badge>
  );
}

export interface OutlineSectionCardProps {
  section: OutlineSection | (Partial<OutlineSection> & { id: string; title: string });
  index: number;
  disabled?: boolean;
  onMove?: (index: number, dir: -1 | 1) => void;
  onChange?: (id: string, patch: Partial<OutlineSection>) => void;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<OutlineSection>) => void;
  onDelete?: (id: string) => void;
}

export function OutlineSectionCard({
  section,
  index,
  disabled,
  onMove,
  onChange,
  onRemove,
  onUpdate,
  onDelete,
}: OutlineSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: Boolean(disabled) });

  const isGenerating =
    section.generation_status === "generating" || section.status === "generating";
  const effectiveStatus: OutlineSection["status"] =
    section.generation_status ?? section.status ?? "pending";
  const wordCount = section.estimated_words ?? section.target_word_count ?? 0;

  const handleUpdate = (patch: Partial<OutlineSection>) => {
    if (onChange) {
      onChange(section.id, patch);
    } else if (onUpdate) {
      onUpdate(section.id, patch);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(section.id);
    } else if (onDelete) {
      onDelete(section.id);
    }
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-90")}>
      <Card
        className={cn(
          isGenerating &&
            "border-[var(--color-publiora-blue)]/60 shadow-sm animate-pulse-soft"
        )}
      >
        <CardBody>
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
              <button
                type="button"
                ref={setActivatorNodeRef}
                className={cn(
                  "text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] touch-none",
                  disabled && "opacity-40 pointer-events-none",
                )}
                aria-label="Seret untuk menyusun ulang"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onMove?.(index, -1)}
                className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                aria-label="Pindah ke atas"
                disabled={disabled || !onMove}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-[var(--color-publiora-black)]">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onMove?.(index, 1)}
                className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                aria-label="Pindah ke bawah"
                disabled={disabled || !onMove}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Input
                value={section.title}
                onChange={(e) => handleUpdate({ title: e.target.value })}
                placeholder="Judul section…"
                disabled={disabled}
              />
              <Textarea
                value={section.summary ?? ""}
                onChange={(e) => handleUpdate({ summary: e.target.value })}
                rows={2}
                placeholder="Ringkasan isi section…"
                disabled={disabled}
              />
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs text-[var(--color-medium-gray)] truncate">
                  ~{wordCount} kata
                </span>
                <SectionStatusBadge status={effectiveStatus} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-[var(--color-medium-gray)] hover:text-[var(--color-danger)] pt-1 shrink-0"
              aria-label="Hapus"
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
