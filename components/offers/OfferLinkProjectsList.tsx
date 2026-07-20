import Link from "next/link";
import { PROJECT_OFFER_RELATIONSHIP_LABELS } from "@/lib/offers/copy";
import type { OfferLinkedProjectSummary } from "@/types/offer";
import { Badge } from "@/components/ui/Badge";

export function OfferLinkProjectsList({
  items,
}: {
  items: OfferLinkedProjectSummary[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--color-medium-gray)]">
        Belum ada proyek yang terhubung.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={`${item.project_id}-${item.relationship}`}
          className="rounded-lg border border-[var(--color-publiora-border)] p-3 flex items-start justify-between gap-2"
        >
          <div>
            <Link
              href={`/projects/${item.project_id}`}
              className="text-sm font-medium text-[var(--color-publiora-black)] hover:underline"
            >
              {item.title || "Proyek tanpa judul"}
            </Link>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="outline">{item.ebook_type}</Badge>
              <Badge variant="default">
                {PROJECT_OFFER_RELATIONSHIP_LABELS[item.relationship]}
              </Badge>
              {item.source_is_newer ? (
                <Badge variant="warning">Produk telah diperbarui</Badge>
              ) : null}
            </div>
          </div>
          <span className="text-xs text-[var(--color-medium-gray)] shrink-0">
            {item.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
