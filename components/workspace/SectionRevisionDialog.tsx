"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function SectionRevisionDialog({
  open,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Tulis ulang section ini?"
      description="Konten saat ini akan disimpan sebagai versi sebelumnya, lalu diganti dengan hasil baru."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Batalkan
          </Button>
          <Button size="sm" onClick={onConfirm} loading={loading}>
            Tulis ulang
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--color-deep-gray)]">
        Tidak ada biaya kredit tambahan untuk menyimpan versi. Generate baru
        tetap memakai biaya section seperti biasa.
      </p>
    </Modal>
  );
}
