"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDeleteProject, useProject } from "@/lib/api/hooks";
import { useProjectStore, useUiStore } from "@/store/projectStore";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { ProjectStatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { OutlinePanel } from "@/components/workspace/OutlinePanel";
import { SectionsPanel } from "@/components/workspace/SectionsPanel";
import { PreviewPanel } from "@/components/workspace/PreviewPanel";
import { ToolsPanel } from "@/components/workspace/ToolsPanel";
import { PublishDialog } from "@/components/workspace/PublishDialog";
import { ArrowLeft, Rocket, Trash2 } from "lucide-react";
import type { ProjectView } from "@/store/projectStore";

const TABS: { value: ProjectView; label: string }[] = [
  { value: "chat", label: "Chat" },
  { value: "outline", label: "Outline" },
  { value: "sections", label: "Sections" },
  { value: "preview", label: "Preview" },
  { value: "tools", label: "Tools" },
];

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data: project, isLoading, isError } = useProject(id);
  const setView = useProjectStore((s) => s.setView);
  const view = useProjectStore((s) => s.view);
  const pushToast = useUiStore((s) => s.pushToast);
  const del = useDeleteProject();
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    if (!project) return;
    if (project.status === "draft") setView("chat");
    else if (project.status === "outline_draft") setView("outline");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.status]);

  // 1–5 switch tabs when not typing
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) {
        e.preventDefault();
        setView(TABS[n - 1].value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setView]);

  const onDelete = async () => {
    try {
      await del.mutateAsync(id);
      pushToast({ title: "Project dihapus", variant: "default" });
      router.replace("/projects");
    } catch {
      pushToast({ title: "Gagal hapus project", variant: "danger" });
    }
  };

  if (isError) {
    return (
      <div className="flex-1 grid place-items-center p-8">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold text-[var(--color-publiora-black)]">
            Project tidak ditemukan
          </h1>
          <p className="text-sm text-[var(--color-medium-gray)]">
            ID tidak valid atau sudah dihapus.
          </p>
          <Link href="/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-[var(--color-publiora-border)] bg-white px-3 sm:px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/projects">
              <Button variant="ghost" size="icon" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              {isLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <h1 className="text-base font-semibold truncate text-[var(--color-publiora-black)]">
                  {project?.title}
                </h1>
              )}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {project && <ProjectStatusPill status={project.status} />}
                <span className="text-xs text-[var(--color-medium-gray)]">
                  {project?.sections_generated ?? 0}/{project?.total_sections ?? 0}{" "}
                  sections
                  {project && project.total_sections > 0
                    ? ` · ${Math.round(
                        (project.sections_generated / project.total_sections) * 100
                      )}%`
                    : ""}
                </span>
              </div>
              {project && project.total_sections > 0 && (
                <div className="mt-2 max-w-xs hidden sm:block">
                  <ProgressBar
                    value={Math.round(
                      (project.sections_generated / project.total_sections) * 100
                    )}
                    barClassName={
                      project.status === "published"
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-publiora-blue)]"
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="hidden sm:inline-flex text-[var(--color-danger)]"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="gold"
              onClick={() => setPublishOpen(true)}
              disabled={!project || project.sections_generated === 0}
            >
              <Rocket className="h-4 w-4" />
              <span className="hidden sm:inline">Publish</span>
            </Button>
          </div>
        </div>

        {/* Tabs — horizontal scroll on mobile */}
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <Tabs
            value={view}
            onChange={(v) => setView(v as ProjectView)}
            tabs={TABS}
            className="w-max min-w-full sm:min-w-0"
          />
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "chat" && <ChatPanel projectId={id} />}
        {view === "outline" && (
          <div className="h-full overflow-y-auto">
            <OutlinePanel projectId={id} />
          </div>
        )}
        {view === "sections" && <SectionsPanel projectId={id} />}
        {view === "preview" && (
          <div className="h-full overflow-y-auto">
            <PreviewPanel projectId={id} />
          </div>
        )}
        {view === "tools" && (
          <div className="h-full overflow-y-auto">
            <ToolsPanel projectId={id} />
          </div>
        )}
      </div>

      {project && (
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          projectId={project.id}
        />
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hapus project?"
        description={`"${project?.title ?? "Project"}" akan dihapus permanen. Outline, sections, dan chat ikut hilang.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" loading={del.isPending} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-medium-gray)]">
          Aksi ini tidak bisa di-undo.
        </p>
      </Modal>
    </div>
  );
}
