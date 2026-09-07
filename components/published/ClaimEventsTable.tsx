import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/PageState";
import { formatPublishedDate, publishedId } from "@/lib/i18n/id/published";
import { getClaimEventStatusCopy } from "@/lib/i18n/id/status";
import type { ClaimEvent } from "@/types/claim-link";

export function ClaimEventsTable({ events, isLoading, isError, onRetry, label = publishedId.claims.eventCaption }: { events?: ClaimEvent[]; isLoading: boolean; isError: boolean; onRetry: () => void; label?: string }) {
  if (isLoading) return <Skeleton className="mt-3 h-20" />;
  if (isError) return <div className="mt-3"><ErrorState description={publishedId.claims.eventsError} onRetry={onRetry} /></div>;
  if (!events?.length) return <div className="mt-3 rounded-xl bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-medium-gray)]">{publishedId.claims.eventsEmpty}</div>;
  return <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-publiora-border)]"><table className="w-full min-w-[36rem] text-sm" aria-label={label}><caption className="sr-only">{label}</caption><thead className="bg-[var(--color-surface-2)] text-left text-xs text-[var(--color-medium-gray)]"><tr><th scope="col" className="p-3">{publishedId.claims.reader}</th><th scope="col" className="p-3">{publishedId.claims.status}</th><th scope="col" className="p-3">{publishedId.claims.time}</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-t border-[var(--color-publiora-border)]"><td className="max-w-xs break-words p-3 text-[var(--color-deep-gray)]">{event.reader_email}</td><td className="p-3"><Badge variant={event.status === "claimed" ? "success" : event.status === "already_owned" ? "info" : event.status === "limit_reached" ? "warning" : event.status === "revoked" ? "danger" : "default"}>{getClaimEventStatusCopy(event.status).label}</Badge></td><td className="whitespace-nowrap p-3 text-[var(--color-medium-gray)]">{formatPublishedDate(event.created_at)}</td></tr>)}</tbody></table></div>;
}
