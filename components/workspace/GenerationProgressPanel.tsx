"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type {
  GenerationQueueItem,
  SequentialGenerationPhase,
} from "@/components/workspace/useSequentialSectionGeneration";
import { cn } from "@/lib/utils";

function statusGlyph(status: GenerationQueueItem["status"]): string {
  switch (status) {
    case "done":
      return "✓";
    case "running":
      return "●";
    case "failed":
      return "!";
    case "skipped":
      return "–";
    default:
      return "○";
  }
}

export function GenerationConfirmDialog({
  open,
  queueCount,
  sectionCost,
  balance,
  onCancel,
  onStart,
  insufficient,
}: {
  open: boolean;
  queueCount: number;
  sectionCost: number;
  balance: number | null;
  onCancel: () => void;
  onStart: () => void;
  insufficient: boolean;
}) {
  const total = queueCount * sectionCost;
  const remaining =
    balance == null ? null : Math.max(0, balance - total);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Mulai menulis section?"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batalkan
          </Button>
          {!insufficient && (
            <Button size="sm" onClick={onStart} disabled={queueCount === 0}>
              Mulai menulis
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-2 text-sm text-[var(--color-deep-gray)]">
        <p>
          Akan menulis <strong>{queueCount}</strong> section
        </p>
        <p>
          Biaya: <strong>{total}</strong> kredit
        </p>
        {balance != null && (
          <>
            <p>
              Saldo saat ini: <strong>{balance}</strong>
            </p>
            <p>
              Sisa perkiraan: <strong>{remaining}</strong>
            </p>
          </>
        )}
        {insufficient && (
          <p className="text-[var(--color-danger,#b91c1c)]">
            Kredit tidak cukup untuk semua section. Isi kredit atau tulis
            section satu per satu.
          </p>
        )}
        {queueCount === 0 && (
          <p>Semua section sudah selesai ditulis.</p>
        )}
      </div>
    </Modal>
  );
}

export function GenerationProgressPanel({
  phase,
  queue,
  currentIndex,
  stopAfterCurrent,
  onStopAfterCurrent,
  onRetry,
  onSkip,
  onStop,
  onClose,
}: {
  phase: SequentialGenerationPhase;
  queue: GenerationQueueItem[];
  currentIndex: number;
  stopAfterCurrent: boolean;
  onStopAfterCurrent: () => void;
  onRetry: () => void;
  onSkip: () => void;
  onStop: () => void;
  onClose: () => void;
}) {
  if (phase === "idle" || phase === "confirm") return null;

  const done = queue.filter((q) => q.status === "done").length;
  const total = queue.length;
  const failed = queue[currentIndex];

  return (
    <div className="border border-[var(--color-publiora-border)] rounded-xl bg-white p-3 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-publiora-black)]">
            Menulis ebook · {Math.min(done + (phase === "running" ? 1 : 0), total)}{" "}
            dari {total}
          </p>
          {phase === "paused_on_failure" && failed?.status === "failed" && (
            <p className="text-xs text-[var(--color-danger,#b91c1c)] mt-1">
              Section gagal ditulis: {failed.title}
              {failed.error ? ` — ${failed.error}` : ""}
            </p>
          )}
          {phase === "completed" && (
            <p className="text-xs text-[var(--color-medium-gray)] mt-1">
              Selesai. {done} section berhasil.
            </p>
          )}
          {phase === "stopped" && (
            <p className="text-xs text-[var(--color-medium-gray)] mt-1">
              Dihentikan setelah section saat ini. {done} section berhasil.
            </p>
          )}
        </div>
        {(phase === "completed" || phase === "stopped") && (
          <Button size="sm" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        )}
      </div>

      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {queue.map((item, i) => (
          <li
            key={item.outline_section_id}
            className={cn(
              "text-sm flex items-center gap-2",
              item.status === "running" && "font-medium",
              item.status === "failed" && "text-[var(--color-danger,#b91c1c)]",
            )}
          >
            <span className="w-4 text-center" aria-hidden>
              {statusGlyph(item.status)}
            </span>
            <span className="truncate">{item.title}</span>
            {i === currentIndex && item.status === "running" && (
              <span className="text-[11px] text-[var(--color-medium-gray)]">
                menulis…
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {phase === "running" && (
          <Button
            size="sm"
            variant="outline"
            onClick={onStopAfterCurrent}
            disabled={stopAfterCurrent}
          >
            {stopAfterCurrent
              ? "Akan berhenti setelah section ini"
              : "Hentikan setelah section ini"}
          </Button>
        )}
        {phase === "paused_on_failure" && (
          <>
            <Button size="sm" onClick={onRetry}>
              Coba ulang
            </Button>
            <Button size="sm" variant="outline" onClick={onSkip}>
              Lewati dan lanjutkan
            </Button>
            <Button size="sm" variant="outline" onClick={onStop}>
              Hentikan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
