"use client";

import * as React from "react";
import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { useOffers } from "@/lib/api/hooks";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { OfferOwnershipBadge } from "@/components/offers/OfferOwnershipBadge";
import { OfferTypeBadge } from "@/components/offers/OfferTypeBadge";
import { OFFER_LIBRARY_LABEL } from "@/lib/offers/copy";
import { formatRelativeTime } from "@/lib/utils";

type FilterKey = "all" | "owned" | "affiliate" | "client" | "archived";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "owned", label: "Milik saya" },
  { key: "affiliate", label: "Affiliate" },
  { key: "client", label: "Klien" },
  { key: "archived", label: "Diarsipkan" },
];

export default function OffersPage() {
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [search, setSearch] = React.useState("");
  const status = filter === "archived" ? "archived" : "active";
  const { data, isLoading } = useOffers({ status, search });

  const items = (data?.items ?? []).filter((item) => {
    if (filter === "all" || filter === "archived") return true;
    return item.ownership === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-publiora-black)]">
            {OFFER_LIBRARY_LABEL}
          </h1>
          <p className="text-sm text-[var(--color-medium-gray)] mt-0.5 max-w-2xl">
            Simpan konteks produk sekali, lalu gunakan untuk Lead Magnet, Bonus
            Pembelian, dan ebook lainnya.
          </p>
        </div>
        <Link href="/offers/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Tambah Produk
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-medium-gray)]" />
          <Input
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk atau penawaran..."
            aria-label="Cari produk"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`h-8 px-2.5 rounded-full text-xs font-medium border ${
                filter === f.key
                  ? "bg-[var(--color-publiora-black)] text-white border-transparent"
                  : "bg-white text-[var(--color-medium-gray)] border-[var(--color-publiora-border)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="Belum ada produk atau penawaran."
            description="Tambahkan produk yang ingin Anda promosikan atau lengkapi dengan ebook."
            action={
              <Link href="/offers/new">
                <Button size="sm">Tambah Produk</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {items.map((offer) => {
            let domain: string | null = null;
            if (offer.destination_url) {
              try {
                domain = new URL(offer.destination_url).hostname;
              } catch {
                domain = offer.destination_url;
              }
            }
            return (
              <Link key={offer.id} href={`/offers/${offer.id}`}>
                <Card className="h-full hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all">
                  <CardBody className="space-y-2">
                    <div className="font-semibold text-sm text-[var(--color-publiora-black)] line-clamp-2">
                      {offer.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <OfferTypeBadge offerType={offer.offer_type} />
                      <OfferOwnershipBadge ownership={offer.ownership} />
                    </div>
                    {offer.primary_outcome ? (
                      <p className="text-xs text-[var(--color-medium-gray)] line-clamp-2">
                        {offer.primary_outcome}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between text-xs text-[var(--color-medium-gray)] pt-1">
                      <span>
                        {offer.linked_project_count} proyek
                        {domain ? ` · ${domain}` : ""}
                      </span>
                      <span>{formatRelativeTime(offer.updated_at)}</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
