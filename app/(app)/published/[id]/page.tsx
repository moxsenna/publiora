"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  useClaimEvents, useClaimLinks, useCreateClaimLink, useCreateExport, useDeleteClaimLink,
  useExports, usePublishedEbook, useRevokeClaimLink,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/PageState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import {
  ClaimEventsTable, ClaimLinksPanel, CreateClaimLinkDialog, ExportsPanel,
  PublicationInfoPanel, PublishedHeader,
} from "@/components/published";
import { getUiErrorMessage } from "@/lib/i18n/id/errors";
import { publishedId } from "@/lib/i18n/id/published";
import type { ClaimCreateInput, ClaimLink } from "@/types/claim-link";
import type { ExportFormat } from "@/types/export";

export default function PublishedDetailPage() {
  return (
    <React.Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"><Skeleton className="h-40" /></div>}>
      <PublishedDetailContent />
    </React.Suspense>
  );
}

function PublishedDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const publication = usePublishedEbook(id);
  const claims = useClaimLinks(id);
  const exportsQuery = useExports(id);
  const createClaim = useCreateClaimLink();
  const revokeClaim = useRevokeClaimLink();
  const deleteClaim = useDeleteClaimLink();
  const createExport = useCreateExport();
  const pushToast = useUiStore((state) => state.pushToast);
  const tabParam = searchParams.get("tab");
  const createParam = searchParams.get("create");
  const [tab, setTab] = React.useState<"claims" | "exports" | "info">(
    tabParam === "exports" ? "exports" : tabParam === "info" ? "info" : "claims",
  );
  const [createOpen, setCreateOpen] = React.useState(createParam === "1");
  const [operationError, setOperationError] = React.useState<string | null>(null);

  // Guided flow: /published/:id?tab=claims&create=1 opens the create dialog
  // and selects the claims tab, even when the params change in place.
  React.useEffect(() => {
    if (createParam === "1") setCreateOpen(true);
    if (tabParam === "exports" || tabParam === "info") setTab(tabParam);
  }, [createParam, tabParam]);

  const submitClaim = async (input: ClaimCreateInput) => {
    setOperationError(null);
    try {
      await createClaim.mutateAsync(input);
      pushToast({ title: publishedId.claims.createdToast, variant: "success" });
      setCreateOpen(false);
      return true;
    } catch (error) { setOperationError(getUiErrorMessage(error)); return false; }
  };
  const revoke = async (link: ClaimLink) => {
    setOperationError(null);
    try {
      await revokeClaim.mutateAsync(link.id);
      pushToast({ title: publishedId.claims.revokedToast, variant: "success" });
    } catch (error) { setOperationError(getUiErrorMessage(error)); throw error; }
  };
  const remove = async (link: ClaimLink) => {
    setOperationError(null);
    try {
      await deleteClaim.mutateAsync(link.id);
      pushToast({ title: publishedId.claims.deletedToast, variant: "success" });
    } catch (error) { setOperationError(getUiErrorMessage(error)); throw error; }
  };
  const startExport = async (format: ExportFormat) => {
    if (createExport.isPending) return;
    setOperationError(null);
    try {
      await createExport.mutateAsync({ ebook_id: id, format });
      pushToast({ title: `${publishedId.exports.started}: ${format.toUpperCase()}`, variant: "success" });
    } catch (error) { setOperationError(getUiErrorMessage(error)); }
  };

  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{publishedId.back}</Button></Link>
    {publication.isLoading ? <Skeleton className="h-40" /> : publication.isError ? <Card><ErrorState description={publishedId.page.loadError} onRetry={() => void publication.refetch()} /></Card> : !publication.data ? <Card><ErrorState title={publishedId.page.missing} /></Card> : <>
      <PublishedHeader ebook={publication.data} onCreateClaimLink={() => setCreateOpen(true)} />
      <Tabs value={tab} onChange={(value) => setTab(value as typeof tab)} ariaLabel="Manajemen publikasi" tabs={[
        { value: "claims", label: publishedId.tabs.claims, content: <ClaimLinksPanel links={claims.data} isLoading={claims.isLoading} isError={claims.isError} onRetry={() => void claims.refetch()} onCreate={() => setCreateOpen(true)} renderEvents={(link) => <ClaimEventsQuery link={link} />} onRevoke={revoke} onDelete={remove} /> },
        { value: "exports", label: publishedId.tabs.exports, content: <ExportsPanel exports={exportsQuery.data} isLoading={exportsQuery.isLoading} isError={exportsQuery.isError} isCreating={createExport.isPending} onRetry={() => void exportsQuery.refetch()} onCreate={(format) => void startExport(format)} /> },
        { value: "info", label: publishedId.tabs.info, content: <PublicationInfoPanel ebook={publication.data} /> },
      ]} />
    </>}
    {operationError && <div role="alert" className="rounded-xl border border-[var(--color-danger)]/30 bg-red-50 p-3 text-sm text-[var(--color-danger)]">{operationError}</div>}
    <CreateClaimLinkDialog open={createOpen} onClose={() => setCreateOpen(false)} ebookId={id} isPending={createClaim.isPending} onSubmit={submitClaim} />
  </div>;
}

function ClaimEventsQuery({ link }: { link: ClaimLink }) {
  const query = useClaimEvents(link.id);
  return <ClaimEventsTable events={query.data} isLoading={query.isLoading} isError={query.isError} onRetry={() => void query.refetch()} label={`${publishedId.claims.eventCaption} ${link.label}`} />;
}
