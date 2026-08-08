import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatPublishedDate, publishedId } from "@/lib/i18n/id/published";
import type { PublishedEbook } from "@/types/published-ebook";

export function PublicationInfoPanel({ ebook }: { ebook: PublishedEbook }) {
  const rows = [
    [publishedId.info.id, ebook.id], [publishedId.info.slug, ebook.slug], [publishedId.info.author, ebook.author],
    [publishedId.info.published, formatPublishedDate(ebook.published_at)], [publishedId.info.sections, ebook.sections.length.toLocaleString("id-ID")],
    [publishedId.info.visibility, ebook.is_public ? publishedId.info.public : publishedId.info.private],
  ];
  return <Card><CardHeader><CardTitle>{publishedId.info.title}</CardTitle><CardDescription>{publishedId.info.description}</CardDescription></CardHeader><CardBody className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-sm" aria-label={publishedId.info.caption}><caption className="sr-only">{publishedId.info.caption}</caption><tbody>{rows.map(([key, value]) => <tr key={key} className="border-t border-[var(--color-publiora-border)]"><th scope="row" className="w-1/3 p-3 text-left font-normal text-[var(--color-medium-gray)]">{key}</th><td className="break-all p-3 text-[var(--color-deep-gray)]">{value}</td></tr>)}</tbody></table></div></CardBody></Card>;
}
