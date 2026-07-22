"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
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
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function OutlineSectionCard({
  section,
  index,
  disabled,
  onMove,
  onChange,
  onRemove,
}: {
  section: OutlineSection;
  index: number;
  disabled?: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onChange: (id: string, patch: Partial<OutlineSection>) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: Boolean(disabled) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-90")}>
      <Card>
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
                onClick={() => onMove(index, -1)}
                className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                aria-label="Pindah ke atas"
                disabled={disabled}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-[var(--color-publiora-black)]">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onMove(index, 1)}
                className="text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)]"
                aria-label="Pindah ke bawah"
                disabled={disabled}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Input
                value={section.title}
                onChange={(e) => onChange(section.id, { title: e.target.value })}
                placeholder="Judul section"
                disabled={disabled}
              />
              <Textarea
                value={section.summary}
                onChange={(e) =>
                  onChange(section.id, { summary: e.target.value })
                }
                rows={2}
                placeholder="Ringkasan isi section"
                disabled={disabled}
              />
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs text-[var(--color-medium-gray)] truncate">
                  ~{section.estimated_words} kata
                </span>
                <SectionStatusBadge status={section.status} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(section.id)}
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
