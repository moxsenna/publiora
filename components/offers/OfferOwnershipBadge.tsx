import { Badge } from "@/components/ui/Badge";
import { offerOwnershipLabel } from "@/lib/offers/copy";
import type { OfferOwnership } from "@/types/offer";

export function OfferOwnershipBadge({
  ownership,
}: {
  ownership: OfferOwnership;
}) {
  const variant =
    ownership === "owned"
      ? "success"
      : ownership === "affiliate"
        ? "info"
        : "gold";
  return <Badge variant={variant}>{offerOwnershipLabel(ownership)}</Badge>;
}
