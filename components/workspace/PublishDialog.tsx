"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { usePublishEbook } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Radio } from "@/components/ui/Radio";
import { publishId } from "@/lib/i18n/id/publish";

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function PublishDialog({ open, onClose, projectId }: PublishDialogProps) {
  const router = useRouter();
  const publish = usePublishEbook();
  const pushToast = useUiStore((s) => s.pushToast);
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");

  const onPublish = async () => {
    if (publish.isPending) return;
    try {
      const ebook = await publish.mutateAsync({
        project_id: projectId,
        is_public: visibility === "public",
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
      title={publishId.title}
      description="Terbitkan versi terbaru ebook untuk pembaca. Visibilitas publik mengaktifkan slug pembaca."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>Batal</Button>
          <Button onClick={onPublish} loading={publish.isPending} disabled={publish.isPending}>
            {publish.isPending ? "Memproses…" : publishId.publishNow}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Label>{publishId.visibility}</Label>
        <Radio
          checked={visibility === "public"}
          onChange={() => setVisibility("public")}
          label={publishId.public}
          description="Slug pembaca aktif dan dapat diakses semua orang."
        />
        <Radio
          checked={visibility === "private"}
          onChange={() => setVisibility("private")}
          label={publishId.private}
          description="Akses hanya tersedia melalui tautan klaim."
        />
      </div>
    </Modal>
  );
}
