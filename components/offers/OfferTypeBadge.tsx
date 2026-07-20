import { Badge } from "@/components/ui/Badge";
import { offerTypeLabel } from "@/lib/offers/copy";
import type { OfferType } from "@/types/offer";

export function OfferTypeBadge({ offerType }: { offerType: OfferType }) {
  return <Badge variant="outline">{offerTypeLabel(offerType)}</Badge>;
}
