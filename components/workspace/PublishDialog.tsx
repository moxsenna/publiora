"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { usePublishEbook } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Radio } from "@/components/ui/Radio";

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
      pushToast({ title: "Ebook published", description: "Klaim link bisa dibuat sekarang.", variant: "success" });
      onClose();
      router.push(`/published/${ebook.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Publish gagal. Periksa blocker dan coba lagi.";
      pushToast({ title: message, variant: "danger" });
    }
  };

  return (
    <Modal
      open={open}
      onClose={publish.isPending ? () => {} : onClose}
      title="Publish ebook"
      description="Publish menjadikan semua section terkini menjadi versi reader. Public = slug aktif."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>Batal</Button>
          <Button onClick={onPublish} loading={publish.isPending} disabled={publish.isPending}>
            {publish.isPending ? "Memproses..." : "Publish sekarang"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Label>Visibility</Label>
        <Radio
          checked={visibility === "public"}
          onChange={() => setVisibility("public")}
          label="Public — slug aktif, claim link bisa diakses"
        />
        <Radio
          checked={visibility === "private"}
          onChange={() => setVisibility("private")}
          label="Private — slug hidden, hanya claim link bisa beri akses"
        />
      </div>
    </Modal>
  );
}
