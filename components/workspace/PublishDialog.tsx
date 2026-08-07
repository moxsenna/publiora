"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { usePublishEbook } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Link2 } from "lucide-react";
import { publishId } from "@/lib/i18n/id/publish";

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  isPublished: boolean;
}

export function PublishDialog(props: PublishDialogProps) {
  return <PublishDialogContent key={`${props.open}:${props.isPublished}`} {...props} />;
}

function PublishDialogContent({ open, onClose, projectId, isPublished }: PublishDialogProps) {
  const router = useRouter();
  const publish = usePublishEbook();
  const pushToast = useUiStore((s) => s.pushToast);

  const onPublish = async () => {
    if (publish.isPending) return;
    try {
      const ebook = await publish.mutateAsync({
        project_id: projectId,
      });
      pushToast({
        title: publishId.success,
        description: "Tautan klaim kini dapat dibuat.",
        variant: "success",
      });
      onClose();
      router.push(`/published/${ebook.id}`);
    } catch {
      pushToast({ title: publishId.failed, variant: "danger" });
    }
  };

  return (
    <Modal
      open={open}
      onClose={publish.isPending ? () => {} : onClose}
      title={isPublished ? publishId.republish : publishId.title}
      description="Ebook akan disimpan sebagai versi terbit dan hanya dapat dibuka oleh Anda atau pembaca yang berhasil melakukan klaim."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>Batal</Button>
          <Button onClick={onPublish} loading={publish.isPending} disabled={publish.isPending}>
            {publish.isPending ? "Memproses…" : (isPublished ? publishId.republish : publishId.publishNow)}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-2.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-publiora-border)] p-3">
        <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-gold)]" />
        <p className="text-xs text-[var(--color-medium-gray)]">
          Terbitkan untuk pembaca — akses hanya melalui tautan klaim yang
          Anda buat setelah terbit.
        </p>
      </div>
    </Modal>
  );
}
