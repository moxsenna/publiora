"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useArchiveOffer,
  useOffer,
  useUpdateOffer,
} from "@/lib/api/hooks";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { OfferForm } from "@/components/offers/OfferForm";
import { OfferLinkProjectsList } from "@/components/offers/OfferLinkProjectsList";
import { OfferOwnershipBadge } from "@/components/offers/OfferOwnershipBadge";
import { OfferTypeBadge } from "@/components/offers/OfferTypeBadge";
import { OFFER_LIBRARY_LABEL } from "@/lib/offers/copy";

export default function OfferDetailPage() {
  const params = useParams<{ offerId: string }>();
  const offerId = params.offerId;
  const router = useRouter();
  const { data, isLoading, error } = useOffer(offerId);
  const update = useUpdateOffer();
  const archive = useArchiveOffer();
  const [editing, setEditing] = React.useState(false);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-5 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-5">
        <p className="text-sm text-[var(--color-danger)]">
          Produk tidak ditemukan.
        </p>
        <Link href="/offers" className="text-sm underline mt-2 inline-block">
          Kembali
        </Link>
      </div>
    );
  }

  const { offer, linked_projects } = data;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 py-5 space-y-4">
      <div>
        <Link
          href="/offers"
          className="text-xs text-[var(--color-medium-gray)] hover:underline"
        >
          ← {OFFER_LIBRARY_LABEL}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mt-1">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
              {offer.name}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <OfferTypeBadge offerType={offer.offer_type} />
              <OfferOwnershipBadge ownership={offer.ownership} />
              {offer.status === "archived" ? (
                <span className="text-xs text-[var(--color-medium-gray)]">
                  Diarsipkan
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Tutup edit" : "Edit"}
            </Button>
            {offer.status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Arsipkan produk ini? Proyek terhubung tetap menyimpan snapshot.",
                    )
                  ) {
                    return;
                  }
                  await archive.mutateAsync(offer.id);
                  router.refresh();
                }}
              >
                Arsipkan
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await update.mutateAsync({
                    id: offer.id,
                    patch: { status: "active" },
                  });
                }}
              >
                Pulihkan
              </Button>
            )}
            <Link
              href={`/projects/new?ebook_type=lead_magnet&offer_id=${offer.id}`}
            >
              <Button size="sm">Buat Lead Magnet</Button>
            </Link>
            <Link
              href={`/projects/new?ebook_type=bonus_product&offer_id=${offer.id}`}
            >
              <Button size="sm" variant="secondary">
                Buat Bonus Pembelian
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {editing ? (
        <Card>
          <CardBody>
            <OfferForm
              initial={offer}
              submitLabel="Simpan perubahan"
              onCancel={() => setEditing(false)}
              onSubmit={async (payload) => {
                await update.mutateAsync({
                  id: offer.id,
                  patch: payload as never,
                });
                setEditing(false);
              }}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-3">
          <Card>
            <CardBody className="space-y-3">
              <Section title="Ringkasan">
                {offer.short_description || "—"}
              </Section>
              <Section title="Target Pembeli">
                {offer.target_audience || "—"}
              </Section>
              <Section title="Masalah Utama">
                {offer.primary_problem || "—"}
              </Section>
              <Section title="Hasil Utama">
                {offer.primary_outcome || "—"}
              </Section>
              <Section title="Tautan">
                {offer.destination_url ? (
                  <a
                    href={offer.destination_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-publiora-blue)] underline break-all"
                  >
                    {offer.destination_url}
                  </a>
                ) : (
                  "—"
                )}
              </Section>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h2 className="text-sm font-semibold mb-3">Proyek Terkait</h2>
              <OfferLinkProjectsList items={linked_projects} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-medium-gray)]">
        {title}
      </h2>
      <div className="text-sm text-[var(--color-deep-gray)] mt-1 whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}
