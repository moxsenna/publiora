"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, ExternalLink, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { ClaimStatusPill } from "@/components/ui/StatusPill";
import { formatPublishedDate, publishedId } from "@/lib/i18n/id/published";
import { buildPublicClaimUrl } from "@/lib/urls";
import type { ClaimLink } from "@/types/claim-link";

export function ClaimLinkRow({ link, eventsPanel, onRevoke, onDelete }: { link: ClaimLink; eventsPanel: React.ReactNode; onRevoke: () => Promise<void>; onDelete: () => Promise<void> }) {
  const [showEvents, setShowEvents] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<"revoke" | "delete" | null>(null);
  const [pending, setPending] = React.useState(false);
  const panelId = React.useId();
  // Distribution links always target the baca (reader) domain. Never derive
  // them from window.location.origin — the app and reader are separate hosts.
  const claimUrl = buildPublicClaimUrl(link.token);
  const claimPath = `/claim/${link.token}`;
  const runConfirmed = async () => {
    if (!confirmation || pending) return;
    setPending(true);
    try { await (confirmation === "revoke" ? onRevoke() : onDelete()); setConfirmation(null); }
    catch { /* Parent maps and displays safe error; keep confirmation open for retry. */ }
    finally { setPending(false); }
  };
  const isRevoke = confirmation === "revoke";
  return <>
    <Card><CardBody><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="break-words font-semibold text-[var(--color-publiora-black)]">{link.label}</span><ClaimStatusPill status={link.status} /></div><div className="mt-1 flex min-w-0 items-center gap-2"><code className="min-w-0 break-all text-xs text-[var(--color-medium-gray)]">{claimUrl}</code><CopyButton value={claimUrl} label={`Salin URL ${link.label}`} /><Link href={claimUrl} target="_blank" rel="noopener noreferrer" aria-label={`Buka tautan klaim ${link.label}`}><Button size="icon" variant="ghost"><ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></Button></Link></div><div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-medium-gray)]"><span>{link.used_count.toLocaleString("id-ID")} {publishedId.claims.used}</span>{link.max_uses != null && <span>/ {link.max_uses.toLocaleString("id-ID")} {publishedId.claims.slots}</span>}{link.expires_at && <span>{publishedId.claims.expires}: {formatPublishedDate(link.expires_at)}</span>}<span>{publishedId.claims.created} {formatPublishedDate(link.created_at)}</span></div></div><div className="flex flex-wrap items-center gap-2 md:shrink-0"><Button size="sm" variant="outline" aria-expanded={showEvents} aria-controls={panelId} aria-label={`${showEvents ? "Sembunyikan" : "Tampilkan"} event ${link.label}`} onClick={() => setShowEvents((value) => !value)}><History aria-hidden="true" className="h-3.5 w-3.5" />{publishedId.actions.events}</Button>{link.status === "active" && <Button size="sm" variant="outline" aria-label={`Cabut tautan ${link.label}`} onClick={() => setConfirmation("revoke")}><Ban aria-hidden="true" className="h-3.5 w-3.5" />{publishedId.actions.revoke}</Button>}<Button size="icon" variant="ghost" aria-label={`Hapus tautan ${link.label}`} onClick={() => setConfirmation("delete")}><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></Button></div></div>{showEvents && <div id={panelId}>{eventsPanel}</div>}</CardBody></Card>
    <Modal open={confirmation !== null} onClose={() => { if (!pending) setConfirmation(null); }} preventClose={pending} title={isRevoke ? publishedId.claims.revokeTitle : publishedId.claims.deleteTitle} description={isRevoke ? publishedId.claims.revokeDescription : publishedId.claims.deleteDescription} footer={<><Button variant="outline" disabled={pending} onClick={() => setConfirmation(null)}>{publishedId.actions.cancel}</Button><Button variant="danger" loading={pending} onClick={() => void runConfirmed()}>{isRevoke ? publishedId.claims.revokeConfirm : publishedId.claims.deleteConfirm}</Button></>}><div className="min-w-0 space-y-1 text-sm text-[var(--color-deep-gray)]"><p className="break-words font-semibold">{link.label}</p><code className="block break-all text-xs text-[var(--color-medium-gray)]">{claimPath}</code></div></Modal>
  </>;
}
