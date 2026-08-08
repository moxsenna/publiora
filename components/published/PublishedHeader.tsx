import Link from "next/link";
import { ExternalLink, FileDown, Link as LinkIcon, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { publishedId } from "@/lib/i18n/id/published";
import type { PublishedEbook } from "@/types/published-ebook";

export function PublishedHeader({ ebook, onCreateClaimLink }: { ebook: PublishedEbook; onCreateClaimLink: () => void }) {
  return <Card><CardBody>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div aria-hidden="true" className="h-20 w-16 shrink-0 rounded-lg" style={{ background: ebook.cover_color }} />
      <div className="min-w-0 flex-1">
        <h1 className="break-words text-2xl font-bold text-[var(--color-publiora-black)]">{ebook.title}</h1>
        {ebook.subtitle && <p className="mt-1 break-words text-[var(--color-medium-gray)]">{ebook.subtitle}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-medium-gray)]">
          <span className="inline-flex items-center gap-1.5"><Users aria-hidden="true" className="h-4 w-4" />{ebook.total_readers.toLocaleString("id-ID")} {publishedId.counters.readers}</span>
          <span className="inline-flex items-center gap-1.5"><LinkIcon aria-hidden="true" className="h-4 w-4" />{ebook.active_claims.toLocaleString("id-ID")} {publishedId.counters.claims}</span>
          <span className="inline-flex items-center gap-1.5"><FileDown aria-hidden="true" className="h-4 w-4" />{ebook.sections.length.toLocaleString("id-ID")} {publishedId.counters.sections}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={`/read/${ebook.slug}`} target="_blank" rel="noopener noreferrer" aria-label={publishedId.reader}>
            <Button variant="outline" size="sm"><ExternalLink aria-hidden="true" className="h-4 w-4" />{publishedId.reader}</Button>
          </Link>
          <Button size="sm" onClick={onCreateClaimLink}><Plus aria-hidden="true" className="h-4 w-4" />{publishedId.actions.createClaim}</Button>
        </div>
      </div>
    </div>
  </CardBody></Card>;
}
