"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  usePublishedEbook,
  useClaimLinks,
  useCreateClaimLink,
  useRevokeClaimLink,
  useDeleteClaimLink,
  useClaimEvents,
  useExports,
  useCreateExport,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { CopyButton } from "@/components/ui/CopyButton";
import { ClaimStatusPill, ExportStatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Plus,
  Link2,
  ExternalLink,
  Ban,
  Trash2,
  FileDown,
  Eye,
  Users,
  Link as LinkIcon,
  History,
} from "lucide-react";

export default function PublishedDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: ebook, isLoading } = usePublishedEbook(id);
  const [tab, setTab] = React.useState<"claims" | "exports" | "info">("claims");
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke dashboard
        </Button>
      </Link>

      {isLoading || !ebook ? (
        <Skeleton className="h-40" />
      ) : (
        <Card>
          <CardBody>
            <div className="flex items-start gap-4">
              <div
                className="h-20 w-16 rounded-lg shrink-0"
                style={{ background: ebook.cover_color }}
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[var(--color-publiora-black)]">{ebook.title}</h1>
                {ebook.subtitle && <p className="text-[var(--color-medium-gray)] mt-1">{ebook.subtitle}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-medium-gray)]">
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {ebook.total_readers} readers</span>
                  <span className="inline-flex items-center gap-1.5"><LinkIcon className="h-4 w-4" /> {ebook.active_claims} active claims</span>
                  <span className="inline-flex items-center gap-1.5"><FileDown className="h-4 w-4" /> {ebook.sections.length} sections</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/read/${ebook.slug}`} target="_blank">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                      Buka reader
                    </Button>
                  </Link>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    New claim link
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        tabs={[
          { value: "claims", label: "Claim links" },
          { value: "exports", label: "Exports" },
          { value: "info", label: "Info" },
        ]}
      />

      {ebook && tab === "claims" && (
        <ClaimsTab ebookId={ebook.id} ebookSlug={ebook.slug} createOpen={createOpen} setCreateOpen={setCreateOpen} />
      )}
      {ebook && tab === "exports" && <ExportsTab ebookId={ebook.id} />}
      {ebook && tab === "info" && <InfoTab ebookId={ebook.id} />}
    </div>
  );
}

function ClaimsTab({
  ebookId,
  ebookSlug,
  createOpen,
  setCreateOpen,
}: {
  ebookId: string;
  ebookSlug: string;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
}) {
  const { data: links, isLoading } = useClaimLinks(ebookId);
  const revoke = useRevokeClaimLink();
  const del = useDeleteClaimLink();
  const pushToast = useUiStore((s) => s.pushToast);

  return (
    <div className="space-y-4">
      <CreateClaimDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        ebookId={ebookId}
      />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !links || links.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Link2 className="h-6 w-6" />}
            title="Belum ada claim link"
            description="Buat link untuk dibagikan ke audiens."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New link</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((l) => (
            <ClaimLinkRow
              key={l.id}
              link={l}
              ebookSlug={ebookSlug}
              onRevoke={() => {
                revoke.mutate(l.id);
                pushToast({ title: "Link di-revoke", variant: "default" });
              }}
              onDelete={() => {
                del.mutate(l.id);
                pushToast({ title: "Link dihapus", variant: "default" });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimLinkRow({
  link,
  ebookSlug,
  onRevoke,
  onDelete,
}: {
  link: import("@/types/claim-link").ClaimLink;
  ebookSlug: string;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  const [showEvents, setShowEvents] = React.useState(false);
  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}/claim/${link.token}`
    : `/claim/${link.token}`;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-publiora-black)]">{link.label}</span>
              <ClaimStatusPill status={link.status} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <code className="text-xs text-[var(--color-medium-gray)] truncate max-w-xs">
                /claim/{link.token}
              </code>
              <CopyButton value={fullUrl} label="Copy URL" />
              <Link href={`/claim/${link.token}`} target="_blank">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="mt-2 text-xs text-[var(--color-medium-gray)] flex flex-wrap gap-3">
              <span>{link.used_count} digunakan</span>
              {link.max_uses != null && <span>/{link.max_uses} slot</span>}
              {link.expires_at && <span>Exp: {new Date(link.expires_at).toLocaleDateString()}</span>}
              <span>Dibuat {new Date(link.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setShowEvents((v) => !v)}>
              <History className="h-3.5 w-3.5" />
              Events
            </Button>
            {link.status === "active" && (
              <Button size="sm" variant="outline" onClick={onRevoke}>
                <Ban className="h-3.5 w-3.5" />
                Revoke
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {showEvents && <ClaimEventsList linkId={link.id} />}
      </CardBody>
    </Card>
  );
}

function ClaimEventsList({ linkId }: { linkId: string }) {
  const { data: events, isLoading } = useClaimEvents(linkId);
  if (isLoading) return <Skeleton className="h-20 mt-3" />;
  if (!events || events.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface-2)] text-sm text-[var(--color-medium-gray)]">
        Belum ada event claim.
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-[var(--color-publiora-border)] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-surface-2)] text-[var(--color-medium-gray)] text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left p-3">Reader</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Waktu</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-[var(--color-publiora-border)]">
              <td className="p-3 text-[var(--color-deep-gray)]">{e.reader_email}</td>
              <td className="p-3">
                <Badge variant={e.status === "claimed" ? "success" : e.status === "already_owned" ? "info" : "default"}>
                  {e.status.replace("_", " ")}
                </Badge>
              </td>
              <td className="p-3 text-[var(--color-medium-gray)]">
                {new Date(e.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateClaimDialog({ open, onClose, ebookId }: { open: boolean; onClose: () => void; ebookId: string }) {
  const create = useCreateClaimLink();
  const pushToast = useUiStore((s) => s.pushToast);
  const [label, setLabel] = React.useState("");
  const [maxUses, setMaxUses] = React.useState("");
  const [expiresIn, setExpiresIn] = React.useState("");

  const submit = async () => {
    if (!label.trim()) {
      pushToast({ title: "Label wajib", variant: "danger" });
      return;
    }
    try {
      await create.mutateAsync({
        ebook_id: ebookId,
        label,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_in_days: expiresIn ? Number(expiresIn) : undefined,
      });
      pushToast({ title: "Claim link dibuat", variant: "success" });
      setLabel("");
      setMaxUses("");
      setExpiresIn("");
      onClose();
    } catch {
      pushToast({ title: "Gagal membuat link", variant: "danger" });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New claim link"
      description="Token unik. Bagikan untuk memberi akses ebook."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={create.isPending}>Create</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="label">Label</Label>
          <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Launch newsletter" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="max">Max uses (opsional)</Label>
            <Input id="max" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
          </div>
          <div>
            <Label htmlFor="exp">Expires (hari)</Label>
            <Input id="exp" type="number" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} placeholder="Never" />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ExportsTab({ ebookId }: { ebookId: string }) {
  const { data: exports, isLoading } = useExports(ebookId);
  const create = useCreateExport();
  const pushToast = useUiStore((s) => s.pushToast);

  const onCreate = async (format: "pdf" | "epub" | "docx") => {
    try {
      await create.mutateAsync({ ebook_id: ebookId, format });
      pushToast({ title: `Export ${format.toUpperCase()} dimulai`, variant: "success" });
    } catch {
      pushToast({ title: "Export gagal", variant: "danger" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onCreate("pdf")}>
              <FileDown className="h-4 w-4" /> Export PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCreate("epub")}>
              <FileDown className="h-4 w-4" /> Export EPUB
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCreate("docx")}>
              <FileDown className="h-4 w-4" /> Export DOCX
            </Button>
          </div>
        </CardBody>
      </Card>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !exports || exports.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileDown className="h-6 w-6" />}
            title="Belum ada export"
            description="Mulai export PDF/EPUB/DOCX di atas."
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-2)] text-[var(--color-medium-gray)] text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3">Format</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3"></th>
                </tr>
              </thead>
              <tbody>
                {exports.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--color-publiora-border)]">
                    <td className="p-3 font-medium uppercase text-[var(--color-deep-gray)]">{e.format}</td>
                    <td className="p-3"><ExportStatusPill status={e.status} /></td>
                    <td className="p-3 text-[var(--color-medium-gray)]">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      {e.url && e.status === "complete" && (
                        <a href={e.url} className="text-[var(--color-publiora-blue)] hover:underline text-xs inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function InfoTab({ ebookId }: { ebookId: string }) {
  const { data: ebook } = usePublishedEbook(ebookId);
  if (!ebook) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ebook info</CardTitle>
        <CardDescription>Detail publikasi.</CardDescription>
      </CardHeader>
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <tbody>
            <InfoRow k="ID" v={ebook.id} />
            <InfoRow k="Slug" v={ebook.slug} />
            <InfoRow k="Author" v={ebook.author} />
            <InfoRow k="Published" v={new Date(ebook.published_at).toLocaleString()} />
            <InfoRow k="Sections" v={`${ebook.sections.length}`} />
            <InfoRow k="Visibility" v={ebook.is_public ? "Public" : "Private"} />
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-t border-[var(--color-publiora-border)]">
      <td className="p-3 text-[var(--color-medium-gray)] w-1/3">{k}</td>
      <td className="p-3 text-[var(--color-deep-gray)]">{v}</td>
    </tr>
  );
}
