"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useSyncProjectOffer } from "@/lib/api/hooks";
import type { Offer, OfferContextSnapshot, ProjectOfferLink } from "@/types/offer";
import { buildOfferContextSnapshot, diffOfferSnapshot } from "@/lib/offers/snapshot";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  link: ProjectOfferLink;
  offer: Offer;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nama produk",
  short_description: "Deskripsi",
  target_audience: "Target pembeli",
  primary_problem: "Masalah utama",
  primary_outcome: "Hasil utama",
  niche: "Niche",
  destination_url: "URL tujuan",
};

export function OfferSyncDialog({
  open,
  onClose,
  projectId,
  link,
  offer,
}: Props) {
  const sync = useSyncProjectOffer();
  const live = buildOfferContextSnapshot(offer);
  const current = link.context_snapshot as OfferContextSnapshot;
  const diffs = diffOfferSnapshot(current, live);
  const [selected, setSelected] = React.useState<string[]>(
    diffs.map((d) => d.field),
  );
  const [applyStrategy, setApplyStrategy] = React.useState(true);
  const [applyCta, setApplyCta] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelected(diffs.map((d) => d.field));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer.updated_at]);

  const toggle = (field: string) => {
    setSelected((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  const submit = async () => {
    setError(null);
    if (selected.length === 0) {
      setError("Pilih minimal satu field.");
      return;
    }
    try {
      await sync.mutateAsync({
        projectId,
        body: {
          link_id: link.id,
          fields: selected as never,
          apply_to_strategy: applyStrategy,
          apply_to_project_cta: applyCta,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal sinkron");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bandingkan perubahan produk"
      description="Informasi produk telah diperbarui. Pilih field yang ingin disinkronkan ke proyek."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Biarkan konteks saat ini
          </Button>
          <Button
            type="button"
            onClick={submit}
            loading={sync.isPending}
            disabled={sync.isPending || diffs.length === 0}
          >
            Sinkronkan ke proyek
          </Button>
        </div>
      }
    >
      {diffs.length === 0 ? (
        <p className="text-sm text-[var(--color-medium-gray)]">
          Tidak ada perbedaan field.
        </p>
      ) : (
        <ul className="space-y-3">
          {diffs.map((d) => (
            <li
              key={d.field}
              className="rounded-lg border border-[var(--color-publiora-border)] p-3"
            >
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(d.field)}
                  onChange={() => toggle(d.field)}
                />
                <span className="flex-1 space-y-1">
                  <span className="block text-sm font-medium">
                    {FIELD_LABELS[d.field] ?? d.field}
                  </span>
                  <span className="block text-xs text-[var(--color-medium-gray)]">
                    Konteks proyek: {d.from || "—"}
                  </span>
                  <span className="block text-xs text-[var(--color-deep-gray)]">
                    Versi produk terbaru: {d.to || "—"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={applyStrategy}
            onChange={(e) => setApplyStrategy(e.target.checked)}
          />
          Terapkan ke Strategy
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={applyCta}
            onChange={(e) => setApplyCta(e.target.checked)}
          />
          Terapkan ke URL CTA proyek
        </label>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
