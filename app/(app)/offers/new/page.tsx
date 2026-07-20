"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { OfferForm } from "@/components/offers/OfferForm";
import { useCreateOffer } from "@/lib/api/hooks";
import { Card, CardBody } from "@/components/ui/Card";
import { OFFER_LIBRARY_LABEL } from "@/lib/offers/copy";

export default function NewOfferPage() {
  const router = useRouter();
  const create = useCreateOffer();

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-5 py-5 space-y-4">
      <div>
        <Link
          href="/offers"
          className="text-xs text-[var(--color-medium-gray)] hover:underline"
        >
          ← {OFFER_LIBRARY_LABEL}
        </Link>
        <h1 className="text-xl font-bold text-[var(--color-publiora-black)] mt-1">
          Tambah Produk
        </h1>
        <p className="text-sm text-[var(--color-medium-gray)] mt-0.5">
          Simpan konteks produk agar bisa dipakai ulang di proyek ebook.
        </p>
      </div>
      <Card>
        <CardBody>
          <OfferForm
            submitLabel="Simpan Produk"
            onCancel={() => router.push("/offers")}
            onSubmit={async (payload) => {
              const result = await create.mutateAsync(payload as never);
              router.push(`/offers/${result.offer.id}`);
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
