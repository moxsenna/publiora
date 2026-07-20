"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ebookTypeLabel } from "@/lib/projects/project-type-copy";
import type { EbookType } from "@/types/project";

export function TypeChangeConfirmDialog({
  open,
  currentType,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  currentType: EbookType;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Ganti tipe ebook?"
      description={`Informasi khusus untuk ${ebookTypeLabel(currentType)} akan dihapus. Informasi umum seperti topik dan target pembaca tetap disimpan.`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button type="button" onClick={onConfirm}>
            Ganti tipe
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--color-medium-gray)]">
        Konfirmasi jika Anda yakin ingin mengganti tujuan ebook.
      </p>
    </Modal>
  );
}
