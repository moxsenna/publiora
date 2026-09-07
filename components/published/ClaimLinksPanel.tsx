import { Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/PageState";
import { Skeleton } from "@/components/ui/Skeleton";
import { publishedId } from "@/lib/i18n/id/published";
import type { ClaimLink } from "@/types/claim-link";
import { ClaimLinkRow } from "./ClaimLinkRow";

export function ClaimLinksPanel({ links, isLoading, isError, onRetry, onCreate, renderEvents, onRevoke, onDelete }: { links?: ClaimLink[]; isLoading: boolean; isError: boolean; onRetry: () => void; onCreate: () => void; renderEvents: (link: ClaimLink) => React.ReactNode; onRevoke: (link: ClaimLink) => Promise<void>; onDelete: (link: ClaimLink) => Promise<void> }) {
  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <Card><ErrorState description={publishedId.claims.loadError} onRetry={onRetry} /></Card>;
  if (!links?.length) return <Card><EmptyState icon={<Link2 className="h-6 w-6" />} title={publishedId.claims.empty} description={publishedId.claims.emptyDescription} action={<Button size="sm" onClick={onCreate}><Plus aria-hidden="true" className="h-4 w-4" />{publishedId.actions.createClaim}</Button>} /></Card>;
  return <div className="space-y-3">{links.map((link) => <ClaimLinkRow key={link.id} link={link} eventsPanel={renderEvents(link)} onRevoke={() => onRevoke(link)} onDelete={() => onDelete(link)} />)}</div>;
}
